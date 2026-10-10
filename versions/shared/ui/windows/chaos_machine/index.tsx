import { MuWindows } from '@/controllers/interface/windowManager';
import './style.less';
import { t } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Bag } from '@/modules/inventory';
import { Economy, MIX_TYPE } from '@/modules/economy/economy';
import { StorageKind } from '@/modules/inventory/itemStorage';
import { recipeNameLines, recipeTextLines, sourceStatus, type MixCheck } from '@/modules/chaos_mix/mixRecipes';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { MsgBoxFrame, MSGBOX_WIDTH, msgBoxHeight } from '@/controllers/interface/components/msg_box_frame';
import { TEXT_COLOR } from '@/controllers/interface/components/mu_text';
import type { MixSource } from '@/controllers/assets';
import { itemLevelName } from '@/controllers/item_rules';
import { itemBaseName } from '@versions/shared/items/itemsDatabase';
import { ItemGrid } from '../../components/item_grid';
import { QuickItemActions } from '@/modules/inventory/quickItemActions';
import { uiClick } from '@/controllers/sound/sfx';
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
  SOURCE_LINE,
  SOURCES_Y,
  TAX_Y,
  TEXT_WIDTH,
  TEXT_X,
  TITLE_Y,
  ZEN_Y,
} from './layout';

const WINDOW_ID = 'chaos-machine';
/** `g_nChaosTaxRate`: no server here sends the castle's chaos tax (ReceiveTaxInfo type 1). */
const CHAOS_TAX_RATE = 0;
/** `MAX_ITEM_INDEX`. */
const STRIDE = 512;
const code = (group: number, num: number) => group * STRIDE + num;

/** The window's title by mix type (`RenderFrame`, NewUIMixInventory.cpp:362-405). */
function titleOf(type: number): string {
  if (type === MIX_TYPE.chaosWeapon) return t('chaos.weapon');
  if (type === MIX_TYPE.option380) return t('chaos.option');
  if (type === MIX_TYPE.chaosCard) return t('chaos.card');
  return t('chaos.regular');
}

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
  const goblin = type !== MIX_TYPE.chaosCard;
  const taxed = Math.trunc(check.requiredZen + (check.requiredZen * CHAOS_TAX_RATE) / 100);
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
      {goblin && (
        <>
          <div className="chaos-line chaos-plate info" style={{ ...plain, top: RATE_Y }}>
            {t('chaos.successRate', { rate: check.successRate })}
          </div>
          <div className="chaos-line chaos-plate info" style={{ ...plain, top: ZEN_Y }}>
            {t(potion ? 'chaos.requiredZenPotion' : 'chaos.requiredZen', { taxed: zen(taxed), zen: zen(check.requiredZen) })}
          </div>
        </>
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
      onClick={uiClick(onClick)}
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
      <MsgBoxFrame lines={MENU_LINES} className="chaos-menu" style={{ top: MENU_TOP }}>
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
          onClick={uiClick(() => Economy.cancelMixMenu())}
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
export const ChaosMachine = observer(() => {
  if (!Economy.mixOpen) return null;

  const picked = Bag.pickedItem;
  const type = Economy.mixInventoryType;
  const card = type === MIX_TYPE.chaosCard;
  const title = titleOf(type);
  // MIX_FINISHED: only the title (and tax) stay up (`RenderFrame` returns early).
  const finished = Economy.mixResult !== null;
  const accepts = !picked || picked.fromStorage === StorageKind.ChaosMachine || Economy.mixAccepts(picked.item);

  const column = 1 + (MuWindows.isOpen('inventory') ? 1 : 0) + (MuWindows.isOpen('character_info') ? 1 : 0);

  return (
    <>
      <MuItemWindow id={WINDOW_ID} className="chaos-machine" column={column} label={title} onClose={() => Economy.closeMix()}>
        <div className="window-title" style={{ top: card ? CARD_TITLE_Y : TITLE_Y }}>
          {title}
        </div>
        {!card && (
          <div className="chaos-tax" style={{ top: TAX_Y }}>
            {t('chaos.taxRate', { rate: CHAOS_TAX_RATE })}
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
            <span className="button-tooltip">{t(MIX_TOOLTIP)}</span>
          </MuButton>
        </div>
      </MuItemWindow>
      {Economy.mixMenuOpen && <MixMenu />}
    </>
  );
});
