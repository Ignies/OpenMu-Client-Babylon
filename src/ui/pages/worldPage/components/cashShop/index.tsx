import './style.less';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import type { Item } from '../../../../../ecs/world';
import { Store } from '../../../../../store';
import { UI_SOUNDS, uiClick } from '../../../../../libs/sfx';
import { SoundsManager } from '../../../../../libs/soundsManager';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { MuWindows } from '../../../../components/muWindow/windowState';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemTooltip } from '../../../../components/itemTooltip';
import { GridSquares, hoveredMask, usedMask } from '../../../../components/itemGrid';
import { TEXT_COLOR } from '../../../../pages/serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  TEXT_INSET_X,
  TEXT_LINE_HEIGHT,
  TEXT_LINES,
  TEXT_TOP,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../../../../components/msgWindow/layout';
import { JEWEL_OF_CHAOS } from '../../../../../common/jewelUpgrade';
import { prefetchItemIcons } from '../../../../../common/itemIconPack';
import { t, type TextKey } from '../../../../../i18n';
import {
  CashShopState,
  abandonRoll,
  blockedReason,
  buy,
  cancelOrder,
  canRoll,
  chaosToSpend,
  committedChaos,
  rollGacha,
  setCashShopTab,
  toggleCashShopWindow,
  type Order,
  type OrderState,
  type Product,
  type ProductLine,
  type Roll,
} from '../../../../../cashShop/state';
import {
  BEAT,
  GACHA_SOUNDS,
  RATTLE_MS,
  TIERS,
  TIER_KEYS,
  type Phase,
  type Tier,
  type TierLook,
} from '../../../../../cashShop/gacha';
import {
  BOX_FALL_FROM,
  BOX_GROUP,
  BOX_HANG,
  BOX_NUM,
  BOX_REST_Y,
  BOX_SIZE,
  BOX_X,
  BUY,
  COLUMNS,
  DROP_LIGHT_Z,
  EXIT,
  EXIT_BESIDE_X,
  EXIT_FRAMES,
  EXIT_SPRITE,
  FEE_RISE,
  FEE_X,
  FEE_Y,
  GRID_FRAME_HEIGHT,
  GRID_FRAME_WIDTH,
  GRID_FRAME_X,
  GRID_FRAME_Y,
  GRID_X,
  GRID_Y,
  HEAD_CLOSE,
  PRIZE_ZOOM,
  ROLL,
  ROLL_FRAMES,
  ROLL_SPRITE,
  ROWS,
  SEAM_Y,
  SELECTION_HEIGHT,
  SELECTION_WIDTH,
  SELECTION_X,
  SELECTION_Y,
  SQUARE,
  SQUARES,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  STAGE_X,
  STAGE_Y,
  TAB_FRAMES,
  TAB_HEIGHT,
  TAB_SPRITE,
  TAB_WIDTH,
  TAB_X,
  TAB_Y,
  TITLE_Y,
  WALLET_HEIGHT,
  WALLET_SPRITE,
  WALLET_WIDTH,
  WALLET_X,
  WALLET_Y,
} from './layout';

/**
 * The cash shop, in the game's own 190x429 item window.
 *
 * It is the NPC shop with Jewels of Chaos for zen: the same grid of 20px
 * squares, the same item icons and tooltips, the same money bar on the bottom
 * edge. A player who can read a merchant can read this without being taught
 * anything.
 *
 * No sign-in. The player is already logged in - the window opens off the item
 * shop button on the bottom bar - and the service names them from the nonce
 * their game socket carries (state.ts), so nothing is ever typed twice.
 *
 * Nothing bought here lands in the bag while this window is open: the shop
 * only ever writes to an account the game server does not have in memory, so
 * an order waits for the player to log out. The fifth tab says so, in one
 * sentence, above the queue, because a purchase that does not appear reads
 * as a bug to anyone who has not been told.
 */

/** The API's labels are written for a web page; five tabs across 165px are not. */
const TAB_LABEL: Record<ProductLine, TextKey> = {
  wings: 'cashShop.tab.wings',
  quest: 'cashShop.tab.quest',
  boxes: 'cashShop.tab.boxes',
  gacha: 'cashShop.tab.gacha',
};

const STATE_LABEL: Record<OrderState, TextKey> = {
  queued: 'cashShop.state.queued',
  delivering: 'cashShop.state.delivering',
  delivered: 'cashShop.state.delivered',
  failed: 'cashShop.state.failed',
  cancelled: 'cashShop.state.cancelled',
};

const TIER_LABEL: Record<Tier, TextKey> = {
  common: 'cashShop.tier.common',
  rare: 'cashShop.tier.rare',
  epic: 'cashShop.tier.epic',
  legendary: 'cashShop.tier.legendary',
};

/**
 * The six options a Season 6 defensive piece can carry, by the label the
 * service writes into a roll (cashshop/server/gacha.ts EXCELLENT_OPTIONS),
 * keyed to the lines the tooltip will print once the piece is in the bag.
 * The service's wording is for its audit log; the player reads their own.
 */
const OPTION_KEY: Record<string, TextKey> = {
  'Increase Zen after hunt +40%': 'item.exc.zen',
  'Defense success rate +10%': 'item.exc.defenseRate',
  'Reflect damage +5%': 'item.exc.reflect',
  'Damage decrease +4%': 'item.exc.damageDecrease',
  'Increase maximum mana +4%': 'item.exc.maxMana',
  'Increase maximum life +4%': 'item.exc.maxLife',
};

const optionText = (option: string): string => {
  const key = OPTION_KEY[option];
  return key ? t(key) : option;
};

const WINDOW_ID = 'cash-shop';

const CHAOS_JEWEL: Item = { group: JEWEL_OF_CHAOS.group, num: JEWEL_OF_CHAOS.num };
const boxItem = (tint: number): Item => ({ group: BOX_GROUP, num: BOX_NUM, lvl: tint });

/** The catalogue laid out on the grid, each entry taking its real footprint. */
type Placed = {
  product: Product;
  item: Item;
  slot: number;
  column: number;
  row: number;
  w: number;
  h: number;
};

/**
 * First fit, left to right and top to bottom, exactly as a merchant's stock is
 * packed. Items keep their real size, so a 5x3 pair of wings looks as big here
 * as it will in the bag.
 */
function layOut(products: Product[]): { squares: (Placed | null)[]; placed: Placed[] } {
  const squares: (Placed | null)[] = new Array(SQUARES).fill(null);
  const placed: Placed[] = [];

  const fits = (column: number, row: number, w: number, h: number) => {
    if (column + w > COLUMNS || row + h > ROWS) return false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (squares[(row + y) * COLUMNS + column + x]) return false;
      }
    }

    return true;
  };

  for (const product of products) {
    if (product.group === null || product.number === null) continue;

    const w = Math.max(1, product.width);
    const h = Math.max(1, product.height);

    let found = -1;

    for (let slot = 0; slot < SQUARES && found < 0; slot++) {
      const column = slot % COLUMNS;
      const row = (slot - column) / COLUMNS;
      if (fits(column, row, w, h)) found = slot;
    }

    if (found < 0) continue;

    const column = found % COLUMNS;
    const row = (found - column) / COLUMNS;
    const entry: Placed = {
      product,
      item: { group: product.group, num: product.number, lvl: product.level },
      slot: found,
      column,
      row,
      w,
      h,
    };

    placed.push(entry);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) squares[(row + y) * COLUMNS + column + x] = entry;
    }
  }

  return { squares, placed };
}

/** The square under the pointer, with the window's scale folded out. */
function squareAt(grid: HTMLElement, clientX: number, clientY: number): number {
  const rect = grid.getBoundingClientRect();
  const scale = rect.width / (COLUMNS * SQUARE);
  const column = Math.floor((clientX - rect.left) / scale / SQUARE);
  const row = Math.floor((clientY - rect.top) / scale / SQUARE);
  const inside = column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;

  return inside ? row * COLUMNS + column : -1;
}

/** A jewel count drawn with the game's own icon, as the money bar draws zen. */
const JewelCount = observer(({ count, short, small }: { count: number; short?: boolean; small?: boolean }) => (
  <span className={`cash-jewel${short ? ' is-short' : ''}${small ? ' is-small' : ''}`}>
    <span className="cash-jewel-icon">
      <ItemIcon item={CHAOS_JEWEL} />
    </span>
    {count}
  </span>
));

/* ---------------------------------------------------------------- confirm */

/**
 * The purchase question, on the message box the social prompts use
 * (`CGuildMsgBoxLayout` and its siblings), portalled to the body: the window
 * is drawn under `transform: scale()`, so anything fixed inside it would be
 * fixed to the window. Enter buys, Escape declines, and both are taken in the
 * capture phase so the keyboard system - which closes the top window on
 * Escape from a document listener - never sees them.
 */
const BuyPrompt = observer(({ product, onAnswer }: { product: Product; onAnswer: (yes: boolean) => void }) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onAnswer(true);
      else if (event.key === 'Escape') onAnswer(false);
      else return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onAnswer]);

  return createPortal(
    <div className="cash-confirm-layer">
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT} className="cash-confirm">
        <div
          className="cash-confirm-text"
          style={{
            left: TEXT_INSET_X,
            right: TEXT_INSET_X,
            top: TEXT_TOP,
            height: TEXT_LINE_HEIGHT * TEXT_LINES,
            lineHeight: `${TEXT_LINE_HEIGHT}px`,
          }}
        >
          <div>{t('cashShop.confirmBuy', { name: product.name, count: product.chaos })}</div>
          <div className="cash-confirm-note">{t('cashShop.confirmDelivery')}</div>
        </div>
        <MuButton
          file={OK_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={ROLL_FRAMES}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => onAnswer(true)}
          style={{ position: 'absolute', left: BTN_BOTH_OK_X, top: BTN_Y }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={ROLL_FRAMES}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => onAnswer(false)}
          style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: BTN_Y }}
        />
      </MuSpriteFrame>
    </div>,
    document.body
  );
});

/* ------------------------------------------------------------- deliveries */

/** What the item on an order is: the roll's name for a gacha, the product's otherwise. */
function orderItemName(order: Order): string {
  const { roll } = order;
  if (!roll) return order.productName;

  const name = roll.excellent ? t('item.excellentPrefix', { name: roll.name }) : roll.name;
  return roll.level > 0 ? `${name} +${roll.level}` : name;
}

/**
 * The fifth tab. Everything the service holds for this account that has not
 * been cancelled, newest first, with its state and - for one still waiting -
 * the service's own reason, which for a queued order is the sentence at the
 * top: it is waiting for the player to log out.
 */
const Deliveries = observer(() => {
  const { orders, ordersError, account, unconfirmed, buyError } = CashShopState;
  const shown = orders.filter(order => order.state !== 'cancelled');
  const note = ordersError ?? buyError ?? (account ? null : unconfirmed);

  return (
    <div
      className="cash-orders"
      data-no-drag="true"
      style={{ left: STAGE_X, top: STAGE_Y, width: STAGE_WIDTH, height: STAGE_HEIGHT }}
    >
      <div className="cash-orders-title">{t('cashShop.deliveriesTitle')}</div>
      <p className="cash-orders-why">{t('cashShop.deliveriesWhy')}</p>

      {note && <p className="cash-orders-note is-bad">{note}</p>}
      {!note && shown.length === 0 && <p className="cash-orders-note">{t('cashShop.noOrders')}</p>}

      <ul className="cash-order-list">
        {shown.map(order => (
          <li key={order.id} className={`cash-order is-${order.state}`}>
            <div className="cash-order-head">
              <span className="cash-order-name">{orderItemName(order)}</span>
              <JewelCount count={order.chaos} small />
            </div>
            <div className="cash-order-state">
              <span className="cash-order-badge">{t(STATE_LABEL[order.state])}</span>
              {order.state === 'queued' && !order.roll && (
                <button
                  type="button"
                  className="cash-order-cancel"
                  onClick={uiClick(() => void cancelOrder(order.id))}
                >
                  {t('cashShop.cancel')}
                </button>
              )}
            </div>
            {order.state !== 'delivered' && (
              <div className="cash-order-reason">
                {order.reason ?? (order.state === 'queued' ? t('cashShop.waitingForLogout') : '')}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});

/* ------------------------------------------------------------------ gacha */

/** Phases in which the box is on the floor rather than gone. */
const BOXED: ReadonlySet<Phase> = new Set<Phase>([
  'falling', 'landed', 'rattling', 'seam', 'strain', 'slam', 'hush', 'burst', 'refused',
]);
/** Phases from which the roll may be looked at. */
const REVEALED: ReadonlySet<Phase> = new Set<Phase>(['burst', 'prize', 'settled']);
/** Phases in which the tier is allowed to show. Withholding it is the design. */
const TOLD: ReadonlySet<Phase> = new Set<Phase>([
  'seam', 'strain', 'slam', 'hush', 'burst', 'prize', 'settled',
]);
/** Phases in which light is outside the window at all. */
const LIT: ReadonlySet<Phase> = new Set<Phase>(['strain', 'slam', 'hush', 'burst', 'prize']);

const count = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/**
 * The reveal's name colour: the first block of `RenderItemInfo`
 * (itemTooltip.ts:105) without the fields a Roll does not carry.
 */
const nameClass = (roll: Roll): string =>
  roll.excellent ? 'is-green' : roll.level >= 7 ? 'is-yellow' : '';

/** The one line under the settled prize: what became of the order. */
function orderStatus(order: Order): string {
  if (order.state === 'delivered') return t('cashShop.orderDelivered');
  if (order.state === 'failed') return order.reason ?? t('cashShop.orderFailed');
  return t('cashShop.orderQueued');
}

/**
 * The prize and what surrounds it. Mounted at the burst and keyed on the
 * seed, so every entrance animation counts from that frame. A reveal that
 * mounts already settled - the tab reopened, the window reopened, a roll the
 * service committed while nobody was watching (abandonRoll in state.ts) -
 * draws the prize at rest instead: the rings, rays and shine were the
 * burst's, and the ceremony was either seen or walked away from. What it
 * remembers is the phase it mounted in, so a settle that arrives during the
 * ceremony leaves the legendary's second shine to finish.
 */
const Reveal = observer(({ roll, look, phase }: { roll: Roll; look: TierLook; phase: Phase }) => {
  const [atRest] = useState(phase === 'settled');

  return (
    <div className={`cash-reveal${atRest ? ' is-rest' : ''}`}>
      {!atRest &&
        count(look.rings).map(i => (
          <span key={i} className="cash-shock" style={{ '--i': i } as CSSProperties} />
        ))}
      {!atRest &&
        count(look.rays).map(i => (
          <span key={i} className="cash-ray" style={{ '--i': i, '--n': look.rays } as CSSProperties} />
        ))}
      {look.halo && <span className="cash-halo" />}

      <div
        className="cash-prize"
        style={{ width: roll.width * SQUARE * PRIZE_ZOOM, height: roll.height * SQUARE * PRIZE_ZOOM }}
      >
        <ItemIcon item={{ group: roll.group, num: roll.num, lvl: roll.level, isExcellent: roll.excellent }} />
        {!atRest && <span className="cash-shine" />}
      </div>

      <div className="cash-prize-tier">{t(TIER_LABEL[roll.tier])}</div>
      <div className={`cash-prize-name ${nameClass(roll)}`}>
        {roll.excellent ? t('item.excellentPrefix', { name: roll.name }) : roll.name}{' '}
        <span className="cash-prize-level">+{roll.level}</span>
      </div>
      {/* A plain piece has no options and no list: the empty space is the tier. */}
      <ul className="cash-prize-options">
        {roll.options.map((option, i) => (
          <li key={option} style={{ '--i': i } as CSSProperties}>
            {optionText(option)}
          </li>
        ))}
      </ul>
    </div>
  );
});

const GachaStage = observer(({ product, blocked }: { product: Product | null; blocked: string | null }) => {
  const { phase, roll, order, rollError, knock } = CashShopState;
  const tier: Tier | null = TOLD.has(phase) && roll ? roll.tier : null;
  const look = TIERS[tier ?? 'common'];
  const stage = useRef<HTMLDivElement>(null);

  // Warm every buffer and all four box tints on mount: nothing in this repo
  // preloads sounds (SOUND_KEYS has no consumer), evictStale() drops them
  // after two map changes, and an <img> swapped at the seam beat would decode
  // a frame late - the frame the whole tell hangs on.
  useEffect(() => {
    for (const key of GACHA_SOUNDS) SoundsManager.loadSound(UI_SOUNDS[key]);
    prefetchItemIcons([CHAOS_JEWEL, ...TIER_KEYS.map(key => boxItem(TIERS[key].tint))]);
  }, []);

  // The counter in the state only ever climbs, so knocks are counted from
  // the press or a fresh box would knock on the way down. The knock has to
  // restart on a lid that stays mounted - remounting would re-decode the
  // icon - so two identical keyframe sets take turns.
  const knockBase = useRef(knock);
  useEffect(() => {
    if (phase === 'falling') knockBase.current = knock;
  }, [phase, knock]);
  const knocks = knock - knockBase.current;
  const knockStyle: CSSProperties | undefined = knocks > 0
    ? { animationName: knocks % 2 ? 'cash-knock' : 'cash-knock-b' }
    : undefined;

  return (
    <>
      <div
        ref={stage}
        data-no-drag="true"
        className={`cash-gacha phase-${phase}${tier ? ` tier-${tier}` : ''}`}
        style={
          {
            left: STAGE_X,
            top: STAGE_Y,
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            '--tier': look.colour,
            '--aura': look.aura,
            '--hush': `${look.hold}ms`,
            '--burst': `${look.burst}px`,
            '--glow': `${look.glow}px`,
            '--shimmer': look.shimmer,
            '--rattle': `${phase === 'seam' || phase === 'strain' ? RATTLE_MS.split : RATTLE_MS.shut}ms`,
            '--fall': `${BOX_FALL_FROM}px`,
            '--hang': `${-BOX_HANG}px`,
            '--seam': `${SEAM_Y}px`,
            '--after-prize': `${BEAT.afterPrize}ms`,
            '--after-name': `${BEAT.afterName}ms`,
            '--after-shine': `${BEAT.afterShine}ms`,
            '--after-option': `${BEAT.afterOption}ms`,
            '--option-step': `${BEAT.optionStep}ms`,
          } as CSSProperties
        }
      >
        {BOXED.has(phase) && (
          <div className="cash-box" style={{ left: BOX_X, top: BOX_REST_Y, width: BOX_SIZE, height: BOX_SIZE }}>
            <span className="cash-box-aura" />
            <span className="cash-box-face cash-box-body">
              <ItemIcon item={boxItem(look.tint)} />
            </span>
            <span className={`cash-box-face cash-box-lid${knockStyle ? ' is-knock' : ''}`} style={knockStyle}>
              <ItemIcon item={boxItem(look.tint)} />
            </span>
            <span className="cash-box-seam" style={{ top: SEAM_Y }} />
            {count(tier ? look.shafts : 0).map(i => (
              <span
                key={i}
                className="cash-box-shaft"
                style={{ top: SEAM_Y, '--i': i, '--n': look.shafts } as CSSProperties}
              />
            ))}
          </div>
        )}

        {phase === 'landed' && <span className="cash-thud" style={{ top: BOX_REST_Y + BOX_SIZE }} />}

        {REVEALED.has(phase) && roll && <Reveal key={roll.seed} roll={roll} look={look} phase={phase} />}

        {phase === 'idle' && rollError && <p className="cash-gacha-status is-bad">{rollError}</p>}
        {phase === 'idle' && !rollError && blocked && <p className="cash-gacha-status">{blocked}</p>}
        {phase === 'idle' && !rollError && !blocked && (
          <p className="cash-gacha-status">{t('cashShop.gachaHint', { count: product?.chaos ?? 0 })}</p>
        )}
        {phase === 'settled' && order && <p className="cash-gacha-status">{orderStatus(order)}</p>}
      </div>

      <DropLight stage={stage} phase={phase} tier={tier} />
    </>
  );
});

/**
 * The light that leaves the window.
 *
 * `.mu-item-window` carries `transform: scale()` (useWindowChrome.tsx:128),
 * so it is the containing block for every `position: fixed` descendant AND
 * its own stacking context - nothing written inside the window can paint
 * over the window stacked next to it, whatever is done to `overflow`. The
 * item tooltip has exactly this problem and solves it exactly this way
 * (itemTooltip/index.tsx:264): portal to the body, position against the
 * viewport. Only the ambient glow escapes; the box, the shafts and the prize
 * stay inside the stage under its `overflow: hidden`, so drag, Exit and the
 * window's place in the stack are untouched. Holds nothing interactive.
 */
const DropLight = observer(
  ({ stage, phase, tier }: { stage: RefObject<HTMLDivElement>; phase: Phase; tier: Tier | null }) => {
    const ref = useRef<HTMLDivElement>(null);
    const lit = tier !== null && TIERS[tier].escape && LIT.has(phase) && !CashShopState.calm;

    useLayoutEffect(() => {
      if (!lit) return;
      let frame = 0;
      // Re-read every frame for the ~1.4s this lives: the player can drag or
      // rescale the window while the box is opening, and one rect read a
      // frame is cheaper than a glow tearing off its window.
      const follow = () => {
        const box = stage.current;
        const el = ref.current;
        if (box && el) {
          const rect = box.getBoundingClientRect();
          el.style.setProperty('--cx', `${rect.left + rect.width / 2}px`);
          el.style.setProperty('--cy', `${rect.top + rect.height / 2}px`);
          el.style.setProperty('--scale', `${MuWindows.scaleOf(WINDOW_ID)}`);
        }
        frame = requestAnimationFrame(follow);
      };
      follow();
      return () => cancelAnimationFrame(frame);
    }, [lit, stage]);

    if (!lit || tier === null) return null;

    return createPortal(
      <div
        ref={ref}
        className={`cash-drop-light tier-${tier} phase-${phase}`}
        style={{ zIndex: DROP_LIGHT_Z, '--tier': TIERS[tier].colour } as CSSProperties}
        aria-hidden="true"
      />,
      document.body
    );
  }
);

/* ----------------------------------------------------------------- window */

export const CashShop = observer(() => {
  const [hover, setHover] = useState<{ slot: number; x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [asking, setAsking] = useState<Product | null>(null);
  /** The product whose order was just taken, so its band says so once. */
  const [justBought, setJustBought] = useState<string | null>(null);

  const { windowOpen, tab, catalogue, lines, status, error, buying, buyError, phase, roll, calm } =
    CashShopState;

  const shown = useMemo(() => catalogue.filter(product => product.line === tab), [catalogue, tab]);
  const { squares, placed } = useMemo(() => layOut(shown), [shown]);
  const used = useMemo(() => usedMask(squares), [squares]);
  const hoveredEntry = hover ? (squares[hover.slot] ?? null) : null;
  const hovered = useMemo(() => hoveredMask(squares, hoveredEntry), [squares, hoveredEntry]);
  const selectedEntry = selectedId ? (placed.find(entry => entry.product.id === selectedId) ?? null) : null;

  // The window opens to sell, not to the queue; and a prompt left up when
  // the window closed under it would be asking a question nobody sees.
  useEffect(() => {
    setOrdersOpen(false);
    setAsking(null);
  }, [windowOpen]);

  if (!windowOpen) return null;

  const items = Store.playerData.items;
  const isGacha = tab === 'gacha' && !ordersOpen;
  const isStock = !isGacha && !ordersOpen;
  const gachaProduct = catalogue.find(product => product.line === 'gacha') ?? null;

  // The bar draws what the next order can spend, never the bag as it is: the
  // jewels for an order leave the bag at delivery, which is after logout, so
  // the live inventory does not move when a purchase is taken. Drawing it
  // unchanged would let a player buy the same jewels twice on screen and be
  // refused for the second; drawing it decremented locally would be a lie
  // about what is in the bag. So the count shown is the service's wallet -
  // bag plus vault at the last save - minus what the queue has promised, and
  // beside it, when anything is promised, how much is held. The bag count is
  // only the fallback before the service has said who we are.
  const spendable = chaosToSpend(items);
  const held = committedChaos();

  const focus = hoveredEntry ?? selectedEntry;
  // Until the session exchange has answered, the block is "not identified
  // yet", which is a wait rather than a verdict, and is worded as one.
  const identifying = !CashShopState.account && !CashShopState.unconfirmed;
  const reasonFor = (product: Product) => {
    const reason = blockedReason(product, items);
    return reason && identifying ? t('cashShop.loading') : reason;
  };
  const selectedBlocked = selectedEntry ? reasonFor(selectedEntry.product) : null;
  const gachaBlocked = gachaProduct ? reasonFor(gachaProduct) : null;
  const spentToday = (product: Product) => CashShopState.spentToday[product.id] ?? 0;

  // The second line of the band, for the entry it is about: the service's
  // refusal, then the order it just took, then why it would refuse, and
  // otherwise today's count against the cap. A hovered entry that is not the
  // selected one only ever gets the count - its verdict is asked for by
  // clicking it.
  const verdict = (entry: Placed): { text: string; tone: 'is-bad' | 'is-good' | 'is-dim' } => {
    if (entry === selectedEntry) {
      if (buyError) return { text: buyError, tone: 'is-bad' };
      if (justBought === entry.product.id) return { text: t('cashShop.orderQueued'), tone: 'is-good' };
      if (selectedBlocked) return { text: selectedBlocked, tone: 'is-bad' };
    }

    return {
      text: t('cashShop.todayCount', { spent: spentToday(entry.product), cap: entry.product.dailyCap }),
      tone: 'is-dim',
    };
  };

  const select = (entry: Placed | null) => {
    setSelectedId(entry ? entry.product.id : null);
    setJustBought(null);
  };

  const openTab = (line: ProductLine) => {
    setOrdersOpen(false);
    setCashShopTab(line);
    select(null);
  };

  const openOrders = () => {
    // The tab setter abandons a drop only when the line changes; the queue is
    // not a line, so the stage is left explicitly before it unmounts.
    if (tab === 'gacha') abandonRoll();
    setOrdersOpen(true);
    select(null);
  };

  const answer = (yes: boolean) => {
    const product = asking;
    setAsking(null);
    if (!yes || !product) return;

    void buy(product.id).then(taken => {
      if (taken) setJustBought(product.id);
    });
  };

  const plateUp = isStock || isGacha;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      label={t('cashShop.title')}
      className="cash-shop"
      onClose={() => toggleCashShopWindow(false)}
    >
      <div className="cash-title" style={{ top: TITLE_Y }}>
        {t('cashShop.title')}
      </div>

      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={() => toggleCashShopWindow(false)} />

      <div className="cash-tabs" data-no-drag="true" style={{ left: TAB_X, top: TAB_Y }}>
        {lines.map((line, index) => (
          <div key={line.id} className="cash-tab" style={{ left: index * TAB_WIDTH }}>
            <MuButton
              file={TAB_SPRITE}
              width={TAB_WIDTH}
              height={TAB_HEIGHT}
              frames={TAB_FRAMES}
              checked={!ordersOpen && line.id === tab}
              label={TAB_LABEL[line.id] ? t(TAB_LABEL[line.id]) : line.label}
              color={!ordersOpen && line.id === tab ? '#ffd88a' : '#9c8f78'}
              activeColor="#dcdcdc"
              labelStyle={{ fontSize: 9 }}
              onClick={() => openTab(line.id)}
            />
          </div>
        ))}
        <div className="cash-tab" style={{ left: lines.length * TAB_WIDTH }}>
          <MuButton
            file={TAB_SPRITE}
            width={TAB_WIDTH}
            height={TAB_HEIGHT}
            frames={TAB_FRAMES}
            checked={ordersOpen}
            label={t('cashShop.tab.orders')}
            color={ordersOpen ? '#ffd88a' : '#9c8f78'}
            activeColor="#dcdcdc"
            labelStyle={{ fontSize: 9 }}
            onClick={openOrders}
          />
        </div>
      </div>

      <MuTableFrame left={GRID_FRAME_X} top={GRID_FRAME_Y} width={GRID_FRAME_WIDTH} height={GRID_FRAME_HEIGHT} />

      {/* Catalogue only, never a roll: the stage paints over this band. */}
      {status === 'loading' && !ordersOpen && <p className="cash-note">{t('cashShop.loading')}</p>}
      {status === 'failed' && !ordersOpen && <p className="cash-note is-bad">{error}</p>}

      {ordersOpen && <Deliveries />}

      {isGacha && <GachaStage product={gachaProduct} blocked={gachaBlocked} />}

      {isStock && (
        <div
          className="cash-grid"
          data-no-drag="true"
          style={{ left: GRID_X, top: GRID_Y, width: COLUMNS * SQUARE, height: ROWS * SQUARE }}
          onPointerMove={event => {
            const slot = squareAt(event.currentTarget, event.clientX, event.clientY);
            const entry = slot >= 0 ? squares[slot] : null;

            setHover(current => {
              if (!entry) return current === null ? current : null;
              if (current && squares[current.slot] === entry) return current;
              return { slot: entry.slot, x: event.clientX, y: event.clientY };
            });
          }}
          onPointerLeave={() => setHover(null)}
          onClick={event => {
            const slot = squareAt(event.currentTarget, event.clientX, event.clientY);
            select(slot >= 0 ? squares[slot] : null);
          }}
        >
          <GridSquares columns={COLUMNS} rows={ROWS} used={used} hovered={hovered} squareClass="cash-square" />

          {placed.map(entry => (
            <div
              key={entry.slot}
              className="cash-item"
              style={{
                left: entry.column * SQUARE,
                top: entry.row * SQUARE,
                width: entry.w * SQUARE,
                height: entry.h * SQUARE,
              }}
            >
              <ItemIcon item={entry.item} />
            </div>
          ))}

          {selectedEntry && (
            <span
              className="cash-selected"
              style={{
                left: selectedEntry.column * SQUARE,
                top: selectedEntry.row * SQUARE,
                width: selectedEntry.w * SQUARE,
                height: selectedEntry.h * SQUARE,
              }}
            />
          )}
        </div>
      )}

      {isStock && hoveredEntry && hover && (
        <ItemTooltip item={hoveredEntry.item} x={hover.x} y={hover.y} context="shop" />
      )}

      {isStock && (
        <div
          className="cash-selection"
          style={{ left: SELECTION_X, top: SELECTION_Y, width: SELECTION_WIDTH, height: SELECTION_HEIGHT }}
        >
          {!focus && (
            <span className={`cash-selection-line ${buyError ? 'is-bad' : 'is-dim'}`}>
              {buyError ?? t('cashShop.pickItem')}
            </span>
          )}
          {focus && (
            <>
              <span className="cash-selection-line">
                <span className="cash-selection-name">{focus.product.name}</span>
                <JewelCount count={focus.product.chaos} short={spendable < focus.product.chaos} />
              </span>
              <span className={`cash-selection-line ${verdict(focus).tone}`}>{verdict(focus).text}</span>
            </>
          )}
        </div>
      )}

      <MuSpriteFrame
        file={WALLET_SPRITE}
        width={WALLET_WIDTH}
        height={WALLET_HEIGHT}
        style={{ position: 'absolute', left: WALLET_X, top: WALLET_Y }}
      />
      <div className="cash-wallet" style={{ left: WALLET_X, top: WALLET_Y, width: WALLET_WIDTH }}>
        <JewelCount count={spendable} />
        {held > 0 && <span className="cash-wallet-held">{t('cashShop.held', { count: held })}</span>}
      </div>

      {/* Window level, after the bar so it paints over it: the stage clips y > 240. */}
      {isGacha && phase === 'landed' && (
        <span className="cash-fee" style={{ left: FEE_X, top: FEE_Y, '--rise': `${FEE_RISE}px` } as CSSProperties}>
          <span className="cash-jewel-icon">
            <ItemIcon item={CHAOS_JEWEL} />
          </span>
        </span>
      )}
      {/* Lit at the burst and left up through `prize`: its fade outlasts the burst beat. */}
      {isGacha && (phase === 'burst' || phase === 'prize') && roll && TIERS[roll.tier].frame && !calm && (
        <span className="cash-frame-flash" style={{ '--tier': TIERS[roll.tier].colour } as CSSProperties} />
      )}

      {/*
        The plate is the price tag: what the press costs, in jewels, once
        there is something to price. A verb beside a price does not fit the
        54px OK plate in most languages ("Comprar" alone is 40px), and the
        verb is said anyway - by the band and the question for a purchase,
        by the stage's own line for a roll - so it is drawn only on the
        stock plate with nothing selected, where there is no price to show.
      */}
      {isStock && (
        <MuButton
          file={ROLL_SPRITE}
          width={BUY.width}
          height={BUY.height}
          frames={ROLL_FRAMES}
          disabled={!selectedEntry || selectedBlocked !== null || buying !== null || status !== 'ready'}
          onClick={() => selectedEntry && setAsking(selectedEntry.product)}
          labelStyle={{ fontSize: 9 }}
          style={{ position: 'absolute', left: BUY.x, top: BUY.y }}
        >
          {selectedEntry ? (
            <JewelCount count={selectedEntry.product.chaos} short={spendable < selectedEntry.product.chaos} small />
          ) : (
            t('cashShop.buy')
          )}
        </MuButton>
      )}

      {isGacha && (
        <MuButton
          file={ROLL_SPRITE}
          width={ROLL.width}
          height={ROLL.height}
          frames={ROLL_FRAMES}
          disabled={!canRoll() || gachaBlocked !== null}
          onClick={() => void rollGacha()}
          labelStyle={{ fontSize: 9 }}
          style={{ position: 'absolute', left: ROLL.x, top: ROLL.y }}
        >
          {canRoll() && gachaProduct ? (
            <JewelCount count={gachaProduct.chaos} short={spendable < gachaProduct.chaos} small />
          ) : (
            '...'
          )}
        </MuButton>
      )}

      <MuButton
        file={EXIT_SPRITE}
        width={EXIT.width}
        height={EXIT.height}
        frames={EXIT_FRAMES}
        onClick={() => toggleCashShopWindow(false)}
        style={{ position: 'absolute', left: plateUp ? EXIT_BESIDE_X : EXIT.x, top: EXIT.y }}
      />

      {asking && <BuyPrompt product={asking} onAnswer={answer} />}
    </MuItemWindow>
  );
});
