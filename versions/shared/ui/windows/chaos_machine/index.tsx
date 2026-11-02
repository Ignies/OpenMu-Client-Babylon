import { MuWindows } from '@/controllers/interface/windowManager';
import './style.less';
import { t, type TextKey } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playUiSound } from '@/controllers/sound/sfx';
import { isTypingInField } from '@/ecs/systems/keyboardInputSystem';
import { Bag } from '@/modules/inventory';
import { Economy, MIX_TYPE } from '@/modules/economy/economy';
import { StorageKind } from '@/modules/inventory/itemStorage';
import { recipeNameLines, recipeTextLines, sourceStatus, type MixCheck } from '@/modules/chaos_mix/mixRecipes';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MsgBoxFrame, MSGBOX_TOP_TITLEBAR_SPRITE, MSGBOX_WIDTH, msgBoxHeight } from '@/controllers/interface/components/msg_box_frame';
import { socketOptionText } from '@/controllers/interface/itemTooltip';
import { Hero } from '@/modules/hero';
import { skills } from '@/modules/skills';
import { TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import type { MixSource } from '@/controllers/assets';
import { itemLevelName } from '@/controllers/item_rules';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import { ItemGrid } from '../../components/item_grid';
import { QuickItemActions } from '@/modules/inventory/quickItemActions';
import {
  CARD_TEXT_LINE,
  CARD_TEXT_Y,
  CARD_TITLE_Y,
  COLUMNS,
  GRID_X,
  GRID_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  MENU_BUTTON_HEIGHT,
  MENU_BUTTON_SPRITE,
  MENU_BUTTON_WIDTH,
  MENU_CLOSE_BOTTOM,
  MENU_CLOSE_SPRITE,
  MENU_CLOSE_WIDTH,
  MENU_LINES,
  MENU_OPTION_BUTTON_Y,
  MENU_OPTION_TEXT_Y,
  MENU_REGULAR_BUTTON_Y,
  MENU_REGULAR_TEXT_Y,
  MENU_TEXT_LINE,
  MENU_TEXT_X,
  MENU_TITLE_Y,
  MENU_TOP,
  MENU_WEAPON_BUTTON_Y,
  MENU_WEAPON_TEXT_Y,
  MIX_BUTTON_FRAMES,
  MIX_BUTTON_HEIGHT,
  MIX_BUTTON_WIDTH,
  MIX_BUTTON_X,
  MIX_BUTTON_Y,
  MIX_SPRITE,
  MIX_TOOLTIP,
  NAME_LINE,
  NAME_Y,
  RATE_Y,
  ROWS,
  SEED_BUTTON_Y,
  SEED_MENU_LINES,
  SEED_TEXT_LINE,
  SEED_TEXT_Y,
  SOCKET_LABEL_Y,
  SOCKET_LIST,
  SOURCE_LINE,
  SOURCES_Y,
  TAX_Y,
  TEXT_WIDTH,
  TEXT_X,
  TITLE_Y,
  ZEN_Y,
} from './layout';

const WINDOW_ID = 'chaos-machine';
/** `MAX_ITEM_INDEX`. */
const STRIDE = 512;
const code = (group: number, num: number) => group * STRIDE + num;

/** The window's title by mix type (`RenderFrame`, NewUIMixInventory.cpp:362-405); also the seed trays' mix button tip. */
const TITLE: Readonly<Record<number, TextKey>> = {
  [MIX_TYPE.chaosWeapon]: 'chaos.weapon',
  [MIX_TYPE.option380]: 'chaos.option',
  [MIX_TYPE.chaosCard]: 'chaos.card',
  [MIX_TYPE.trainer]: 'chaos.trainer',
  [MIX_TYPE.extractSeed]: 'chaos.extraction',
  [MIX_TYPE.seedSphere]: 'chaos.assembly',
  [MIX_TYPE.attachSocket]: 'chaos.application',
  [MIX_TYPE.detachSocket]: 'chaos.destruction',
};
const titleOf = (type: number) => t(TITLE[type] ?? 'chaos.regular');

/** The goblin's three kinds: a tax line, and the title 5 higher. */
const isGoblin = (type: number) => type <= MIX_TYPE.option380;
const isSocketTray = (type: number) => type === MIX_TYPE.attachSocket || type === MIX_TYPE.detachSocket;

/** `CMixRecipes::GetSourceName`'s kind names for ranges of item codes (MixMgr.cpp:676-711). */
function kindName(source: MixSource): string | null {
  const { typeMin: min, typeMax: max } = source;
  if (source.special & 2) return t('chaos.kind.380');
  if (min === 0 && (max === code(11, 511) || max === code(13, 511))) return t('chaos.kind.equipment');
  if (min === 0 && max === code(5, 511)) return t('chaos.kind.weapon');
  if (min === code(6, 0) && max === code(11, 511)) return t('chaos.kind.defense');
  if ((min === code(12, 0) && max === code(12, 2)) || (min === code(12, 41) && max === code(12, 41))) return t('chaos.kind.basicWing');
  if ((min === code(12, 3) && max === code(12, 6)) || (min === code(12, 42) && max === code(12, 42))) return t('chaos.kind.secondWing');
  if (min === max && (min === code(2, 6) || min === code(4, 6) || min === code(5, 7))) return t('chaos.kind.chaosWeapon');
  if (min === code(12, 60) && max === code(12, 65)) return t('chaos.kind.seed');
  if (min === code(12, 70) && max === code(12, 74)) return t('chaos.kind.sphere');
  if (min === code(12, 100) && max === code(12, 129)) return t('chaos.kind.seedSphere');
  return null;
}

const range = (min: number, max: number, word = '') => {
  const tail = word ? ` ${word}` : '';
  if (min === 0 && max === 255) return '';
  if (min === max) return ` +${min}${tail}`;
  if (min === 0) return ` +${max}${tail} ${t('chaos.word.maximum')}`;
  if (max === 255) return ` +${min}${tail} ${t('chaos.word.minimum')}`;
  return ` +${min}~${max}${tail}`;
};

/** `GetSourceName` (MixMgr.cpp:654-769): what a recipe source asks for, in the original's word order. */
function sourceName(source: MixSource): string {
  const group = Math.trunc(source.typeMin / STRIDE);
  const num = source.typeMin % STRIDE;
  let name = itemLevelName(group, num, source.levelMin, String(itemBaseName(group, num) ?? ''));
  const exact =
    source.typeMin === source.typeMax &&
    (source.levelMin === source.levelMax || (source.levelMin === 0 && source.levelMax === 255)) &&
    (source.optionMin === source.optionMax || (source.optionMin === 0 && source.optionMax === 255));
  if (exact) {
    if (source.durabilityMin === source.durabilityMax) name += `(${source.durabilityMin})`;
  } else {
    // A plain item name loses the "+N" its level gave it.
    name = kindName(source) ?? name.replace(/ \+\d+$/, '');
    if (source.durabilityMin === source.durabilityMax) name += `(${source.durabilityMin})`;
    name += range(source.levelMin, source.levelMax);
    name += range(source.optionMin, source.optionMax, t('chaos.word.option'));
  }
  const { countMin: min, countMax: max } = source;
  const quantity = t('chaos.word.quantity');
  if (min === 0 && max === 255) name += ` (${t('chaos.word.rateIncrease')})`;
  else if (min === max) name += ` ${min} ${quantity}`;
  else if (min === 0) name += ` ${max} ${quantity} ${t('chaos.word.maximum')}`;
  else if (max === 255) name += ` ${min} ${quantity} ${t('chaos.word.minimum')}`;
  else name += ` ${min}~${max} ${quantity}`;
  // The last prefix that applies wins, as each one rewrites the line.
  const prefix = [
    [1, 'chaos.prefix.excellent'],
    [4, 'chaos.prefix.set'],
    [8, 'chaos.prefix.improve'],
    [16, 'chaos.prefix.socket'],
  ].filter(([bit]) => source.special & (bit as number)).at(-1)?.[1];
  return prefix ? `${t(prefix as Parameters<typeof t>[0])} ${name}` : name;
}

const zen = (amount: number) => amount.toLocaleString('en-US');
const SOURCE_COLOR = { yes: '#ffff30', partly: '#d2e6ff', no: '#ff3214' } as const;

/** `RenderFrame`'s recipe block (NewUIMixInventory.cpp:421-640). */
const RecipeText = observer(({ check, type }: { check: MixCheck; type: number }) => {
  const ready = !!check.recipe;
  const names = check.recipe ? recipeNameLines(check.recipe, check.firstItemType) : [t('chaos.improper')];
  // The rate shows for the goblin and the Seed Master; the zen for them and the Seed Researcher too.
  const rated = isGoblin(type) || type === MIX_TYPE.extractSeed || type === MIX_TYPE.seedSphere;
  const priced = rated || isSocketTray(type);
  const taxed = Math.trunc(check.requiredZen + (check.requiredZen * Economy.chaosTaxRate) / 100);
  const potion = ready && check.recipe?.zenType === 'C';
  const similar = check.similar;
  const plain = { left: TEXT_X, width: TEXT_WIDTH };
  return (
    <>
      <div className={`chaos-line chaos-plate ${ready ? 'ready' : 'missing'}`} style={{ ...plain, top: NAME_Y }}>
        {names[0]}
      </div>
      {!!names[1] && (
        <div className={`chaos-line chaos-plate ${ready ? 'ready' : 'missing'}`} style={{ ...plain, top: NAME_Y + NAME_LINE }}>
          {names[1]}
        </div>
      )}
      {rated && (
        <div className="chaos-line chaos-plate info" style={{ ...plain, top: RATE_Y }}>
          {t('chaos.successRate', { rate: check.successRate })}
        </div>
      )}
      {priced && (
        <div className="chaos-line chaos-plate info" style={{ ...plain, top: rated ? ZEN_Y : RATE_Y }}>
          {t(potion ? 'chaos.requiredZenPotion' : 'chaos.requiredZen', { taxed: zen(taxed), zen: zen(check.requiredZen) })}
        </div>
      )}
      <div className="chaos-sources" style={{ ...plain, top: SOURCES_Y, lineHeight: `${SOURCE_LINE}px` }}>
        {similar ? (
          <>
            {!ready && (
              <div className="chaos-plate note">
                {t('chaos.prediction', { name: recipeNameLines(similar, check.firstItemType, true)[0] })}
              </div>
            )}
            {similar.sources.map((source, i) => (
              <div key={i} className="chaos-plate" style={{ color: SOURCE_COLOR[sourceStatus(check, i)] }}>
                {sourceName(source)}
              </div>
            ))}
          </>
        ) : check.empty ? (
          <div className="chaos-plate warn">{t('chaos.uploadItems')}</div>
        ) : (
          <>
            <div className="chaos-plate warn">{t('chaos.prediction', { name: ' ' })}</div>
            <div className="chaos-plate warn">{t('chaos.improper')}</div>
          </>
        )}
        <div className="chaos-gap" />
        {recipeTextLines(check.recipe ? check.recipe.descriptions : (similar?.advice ?? [])).map((line, i) => (
          <div key={i} className="chaos-plate warn">
            {line}
          </div>
        ))}
      </div>
    </>
  );
});

/** `RenderMixDescriptions` for the Chaos Card Master (NewUIMixInventory.cpp:735-753). */
const CardText = observer(() => (
  <>
    <div className="chaos-line chaos-card-warning" style={{ left: TEXT_X, width: TEXT_WIDTH, top: CARD_TEXT_Y + 4 * CARD_TEXT_LINE }}>
      {t('chaosCard.warning')}
    </div>
    {(['chaosCard.once', 'chaosCard.space', 'chaosCard.special'] as const).map((key, i) => (
      <div key={key} className="chaos-line chaos-card-note" style={{ left: TEXT_X - 10, width: 200, top: CARD_TEXT_Y + (6 + i) * CARD_TEXT_LINE }}>
        {t(key)}
      </div>
    ))}
  </>
));

/** `RenderMixDescriptions` for the seed researcher: the socket item's sockets, one to pick (`m_SocketListBox`). */
const SocketList = observer(({ type }: { type: number }) => {
  const hero = Hero.heroStats();
  const maxima = { maxLife: Hero.maxHP, maxMana: Hero.maxMP, masterLevel: skills.masterLevel };
  return (
    <>
      <div className="chaos-line chaos-socket-label" style={{ left: TEXT_X, width: TEXT_WIDTH, top: SOCKET_LABEL_Y }}>
        {t(type === MIX_TYPE.attachSocket ? 'chaos.selectApplicable' : 'chaos.selectDestructibleSocket')}
      </div>
      <div
        className="chaos-socket-list"
        data-no-drag="true"
        style={{ left: SOCKET_LIST.x, top: SOCKET_LIST.top, width: SOCKET_LIST.width, height: SOCKET_LIST.height }}
      >
        {Economy.mixSockets.map((socket, i) => (
          <div
            key={i}
            className={`chaos-socket-line${i === Economy.mixSocket ? ' picked' : ''}`}
            style={{ height: SOCKET_LIST.line, lineHeight: `${SOCKET_LIST.line}px`, paddingLeft: SOCKET_LIST.textX }}
            onClick={() => Economy.selectMixSocket(i)}
          >
            {`${i + 1}: ${(socket && socketOptionText(socket, hero, maxima)) || t('item.socketEmpty')}`}
          </div>
        ))}
      </div>
    </>
  );
});

/** `CSeedMasterMenuMsgBox` / `CSeedInvestigatorMenuMsgBox`: which of the NPC's two trays to open. */
const SeedMenu = observer(({ npc }: { npc: 'master' | 'researcher' }) => {
  const master = npc === 'master';
  const lines = master ? (['seed.master1', 'seed.master2'] as const) : (['seed.researcher1', 'seed.researcher2'] as const);
  const trays = master
    ? ([['seed.extract', MIX_TYPE.extractSeed], ['seed.sphere', MIX_TYPE.seedSphere]] as const)
    : ([['seed.apply', MIX_TYPE.attachSocket], ['seed.destroy', MIX_TYPE.detachSocket]] as const);
  const button = (file: string, width: number, label: string, top: number, onClick: () => void) => (
    <MuButton
      key={label}
      file={file}
      width={width}
      height={MENU_BUTTON_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      label={label}
      labelStyle={{ fontSize: 11 }}
      onClick={onClick}
      style={{ position: 'absolute', left: (MSGBOX_WIDTH - width) / 2, top }}
    />
  );
  return (
    <div className="chaos-menu-layer" data-no-drag="true">
      <MsgBoxFrame lines={SEED_MENU_LINES} top={MSGBOX_TOP_TITLEBAR_SPRITE} className="chaos-menu" style={{ top: MENU_TOP }}>
        <div className="chaos-menu-title seed-menu-title" style={{ left: MENU_TEXT_X, right: MENU_TEXT_X, top: MENU_TITLE_Y }}>
          {t(master ? 'seed.master' : 'seed.researcher')}
        </div>
        {lines.map((key, i) => (
          <div key={key} className="chaos-menu-line" style={{ left: MENU_TEXT_X, right: MENU_TEXT_X, top: SEED_TEXT_Y + i * SEED_TEXT_LINE }}>
            {t(key)}
          </div>
        ))}
        {trays.map(([key, type], i) => button(MENU_BUTTON_SPRITE, MENU_BUTTON_WIDTH, t(key), SEED_BUTTON_Y[i], () => Economy.chooseSeedMix(type)))}
        {button(MENU_CLOSE_SPRITE, MENU_CLOSE_WIDTH, t('chaos.menu.close'), msgBoxHeight(SEED_MENU_LINES) - MENU_CLOSE_BOTTOM, () => Economy.closeSeedMenu())}
      </MsgBoxFrame>
    </div>
  );
});

/** `CChaosMixMenuMsgBox`: which kind of combination the goblin should match the tray against. */
const MixMenu = observer(() => {
  const button = (label: string, top: number, onClick: () => void) => (
    <MuButton
      file={MENU_BUTTON_SPRITE}
      width={MENU_BUTTON_WIDTH}
      height={MENU_BUTTON_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      label={label}
      labelStyle={{ fontSize: 11 }}
      onClick={onClick}
      style={{ position: 'absolute', left: (MSGBOX_WIDTH - MENU_BUTTON_WIDTH) / 2, top }}
    />
  );
  const lines = (keys: readonly Parameters<typeof t>[0][], top: number) =>
    keys.map((key, i) => (
      <div key={key} className="chaos-menu-line" style={{ left: MENU_TEXT_X, right: MENU_TEXT_X, top: top + i * MENU_TEXT_LINE }}>
        {t(key)}
      </div>
    ));
  return (
    <div className="chaos-menu-layer" data-no-drag="true">
      {/* `IMAGE_MSGBOX_TOP_TITLEBAR`, as the seed menus (NewUICustomMessageBox.cpp:2921). */}
      <MsgBoxFrame lines={MENU_LINES} top={MSGBOX_TOP_TITLEBAR_SPRITE} className="chaos-menu" style={{ top: MENU_TOP }}>
        <div className="chaos-menu-title" style={{ left: MENU_TEXT_X, right: MENU_TEXT_X, top: MENU_TITLE_Y }}>
          {t('chaos.menu.title')}
        </div>
        {lines(['chaos.menu.regular1', 'chaos.menu.regular2', 'chaos.menu.regular3'], MENU_REGULAR_TEXT_Y)}
        {button(t('chaos.regular'), MENU_REGULAR_BUTTON_Y, () => Economy.chooseMixType(MIX_TYPE.regular))}
        {lines(['chaos.menu.weapon1', 'chaos.menu.weapon2'], MENU_WEAPON_TEXT_Y)}
        {button(t('chaos.weapon'), MENU_WEAPON_BUTTON_Y, () => Economy.chooseMixType(MIX_TYPE.chaosWeapon))}
        {lines(['chaos.add380'], MENU_OPTION_TEXT_Y)}
        {button(t('chaos.option'), MENU_OPTION_BUTTON_Y, () => Economy.chooseMixType(MIX_TYPE.option380))}
        <MuButton
          file={MENU_CLOSE_SPRITE}
          width={MENU_CLOSE_WIDTH}
          height={MENU_BUTTON_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('chaos.menu.close')}
          labelStyle={{ fontSize: 11 }}
          onClick={() => Economy.cancelMixMenu()}
          style={{ position: 'absolute', left: (MSGBOX_WIDTH - MENU_CLOSE_WIDTH) / 2, top: msgBoxHeight(MENU_LINES) - MENU_CLOSE_BOTTOM }}
        />
      </MsgBoxFrame>
    </div>
  );
});

/**
 * `CNewUIMixInventory`: the goblin's tray. Items go in from the inventory; the window names the
 * `Mix.bmd` recipe they make (`CMixRecipeMgr`), its success rate and zen, and what the closest recipe
 * still lacks. The button confirms and sends the recipe's id; the result comes back as
 * `ItemCraftingResult` and lands in the tray, where it has to be dragged out before the window will
 * close (`ClosingProcess`).
 */
/** `CNewUICommonMessageBox` (OK) at y 100: the text from 35, 180 wide, a slice per line past two; OK 50 off the bottom. */
const NOTICE = { top: 100, textTop: 35, textWidth: 180, line: 15, button: { width: 54, height: 30 }, bottom: 50 };

/** `CreateOkMessageBox` after a refused mix (WSclient.cpp:6812-6820); OK and Escape close it with a click. */
const MixNotice = observer(({ text }: { text: string }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(2);
  useLayoutEffect(() => {
    const height = textRef.current?.scrollHeight;
    if (height) setLines(Math.max(1, Math.round(height / NOTICE.line)));
  }, [text]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || isTypingInField()) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      playUiSound('click');
      Economy.closeMixNotice();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  const middle = Math.max(0, lines - 2);
  return (
    <div className="chaos-menu-layer" data-no-drag="true">
      <MsgBoxFrame lines={middle} className="chaos-menu" style={{ top: NOTICE.top }}>
        <div
          ref={textRef}
          className="chaos-menu-line"
          style={{ left: (MSGBOX_WIDTH - NOTICE.textWidth) / 2, width: NOTICE.textWidth, top: NOTICE.textTop, lineHeight: `${NOTICE.line}px` }}
        >
          {text}
        </div>
        <MuButton
          file="newui_button_ok.OZT"
          width={NOTICE.button.width}
          height={NOTICE.button.height}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={() => Economy.closeMixNotice()}
          style={{ position: 'absolute', left: (MSGBOX_WIDTH - NOTICE.button.width) / 2, top: msgBoxHeight(middle) - NOTICE.bottom }}
        />
      </MsgBoxFrame>
    </div>
  );
});

export const ChaosMachine = observer(() => {
  const notice = Economy.mixNotice && <MixNotice text={t(Economy.mixNotice)} />;
  if (!Economy.mixOpen) {
    return (
      <>
        {Economy.seedMenu && <SeedMenu npc={Economy.seedMenu} />}
        {notice}
      </>
    );
  }

  const picked = Bag.pickedItem;
  const type = Economy.mixInventoryType;
  const card = type === MIX_TYPE.chaosCard;
  const goblin = isGoblin(type);
  const title = titleOf(type);
  // MIX_FINISHED: only the title (and tax) stay up (`RenderFrame` returns early).
  const finished = Economy.mixResult !== null;
  const accepts = !picked || picked.fromStorage === StorageKind.ChaosMachine || Economy.mixAccepts(picked.item);

  const column = 1 + (MuWindows.isOpen('inventory') ? 1 : 0) + (MuWindows.isOpen('character_info') ? 1 : 0);

  return (
    <>
      <MuItemWindow id={WINDOW_ID} className="chaos-machine" column={column} label={title} onClose={() => Economy.closeMix()}>
        <div className="window-title" style={{ top: goblin ? TITLE_Y : CARD_TITLE_Y }}>
          {title}
        </div>
        {goblin && (
          <div className="chaos-tax" style={{ top: TAX_Y }}>
            {t('chaos.taxRate', { rate: Economy.chaosTaxRate })}
          </div>
        )}

        <div
          className="head-close"
          data-no-drag="true"
          style={{ left: HEAD_CLOSE_X, top: HEAD_CLOSE_Y, width: HEAD_CLOSE_WIDTH, height: HEAD_CLOSE_HEIGHT }}
          onClick={() => Economy.closeMix()}
        />

        {!finished && !Economy.mixMenuOpen && <RecipeText check={Economy.mixCheck} type={type} />}
        {card && <CardText />}
        {isSocketTray(type) && <SocketList type={type} />}

        <ItemGrid
          items={Economy.mixItems}
          columns={COLUMNS}
          rows={ROWS}
          left={GRID_X}
          top={GRID_Y}
          disabled={Economy.mixPending || !!Bag.pendingItemMove}
          dropTint={picked ? (accepts ? 'ok' : 'ban') : 'none'}
          onPick={square => Bag.pickItem(StorageKind.ChaosMachine, square)}
          onPlace={square => {
            if (accepts) Bag.placePickedItem(square, StorageKind.ChaosMachine);
          }}
          onUse={square => Bag.autoMoveItem(StorageKind.ChaosMachine, square, StorageKind.Inventory)}
          onQuickAction={square => QuickItemActions.toInventory(StorageKind.ChaosMachine, square)}
        />

        <div className="window-button" data-no-drag="true" style={{ left: MIX_BUTTON_X, top: MIX_BUTTON_Y }}>
          <MuButton
            file={MIX_SPRITE}
            width={MIX_BUTTON_WIDTH}
            height={MIX_BUTTON_HEIGHT}
            frames={MIX_BUTTON_FRAMES}
            disabled={Economy.mixPending || finished}
            onClick={() => Economy.mix()}
          >
            <span className="button-tooltip">{type >= MIX_TYPE.extractSeed ? title : t(MIX_TOOLTIP)}</span>
          </MuButton>
        </div>
      </MuItemWindow>
      {Economy.mixMenuOpen && <MixMenu />}
      {notice}
    </>
  );
});
