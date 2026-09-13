import { isKey } from '../../../../../common/keyBindings';
import { t } from '../../../../../i18n';
import './style.less';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../../../../../libs/eventBus';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { Store } from '../../../../../store';
import { GameOptions } from '../../../../../common/gameOptions';
import { StatAllocation } from '../../../../../common/statAllocation';
import { devQueryNumber } from '../../../../../common/devSeams';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { toggleMasterSkillsWindow } from '../masterSkills/windowState';
import { togglePetInfoWindow } from '../petInfo/windowState';
import {
  MuItemWindow,
  MuTableFrame,
  MuTableRule,
} from '../../../../components/muWindow';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { pkTextColour, PVP_NEUTRAL } from '../../../../../common/nameTags';
import {
  BaseClass,
  deriveCharacterStats,
  getBaseClass,
  getClassName,
  StatType,
} from '../../../../../common/characterStats';
import {
  AMOUNT_DY,
  AMOUNT_HEIGHT,
  AMOUNT_MAX_DIGITS,
  AMOUNT_WIDTH,
  AMOUNT_X,
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  CLASS_Y,
  DETAIL_FIRST_DY,
  DETAIL_FIRST_DY_STRENGTH,
  DETAIL_LINE_HEIGHT,
  DETAIL_X,
  DETAIL_X_ENERGY,
  EXIT_BUTTON_X,
  EXIT_SPRITE,
  EXIT_TOOLTIP,
  EXP_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  LABEL_WIDTH,
  LABEL_X,
  LEVEL_FIELD_HEIGHT,
  LEVEL_FIELD_Y,
  MASTER_BUTTON_X,
  MASTER_SPRITE,
  MASTER_TOOLTIP,
  NAME_Y,
  PET_BUTTON_X,
  PET_SPRITE,
  PET_TOOLTIP,
  POINTS_RUN_RIGHT,
  POINTS_X,
  POINT_Y,
  PROBABILITY_Y,
  QUEST_BUTTON_X,
  QUEST_SPRITE,
  QUEST_TOOLTIP,
  ROW_FIELD_HEIGHT,
  ROW_HEIGHT,
  ROW_SPRITE,
  ROW_WIDTH,
  ROW_X,
  ROW_Y,
  STAT_BUTTON_DY,
  STAT_BUTTON_HEIGHT,
  STAT_BUTTON_SPRITE,
  STAT_BUTTON_WIDTH,
  STAT_BUTTON_X,
  STOP_BUTTON_FRAMES,
  TABLE_FILL_HEIGHT,
  TABLE_FILL_WIDTH,
  TABLE_HEIGHT,
  TABLE_RULE_WIDTH,
  TABLE_RULE_X,
  TABLE_RULE_Y,
  TABLE_TEXT_X,
  TABLE_WIDTH,
  TABLE_X,
  TABLE_Y,
  TEXT_COLOR,
  VALUE_WIDTH,
  VALUE_WIDTH_WITH_AMOUNT,
  VALUE_X,
  WIN_WIDTH,
} from './layout';

const WINDOW_ID = 'character-info';

type DetailLine = { text: string; color?: string };

const HOT_KEY = 'characterInfo';

function fruitProbability(used: number, max: number): number {
  if (used <= 10) return 100;

  const ratio = max === 0 ? 0 : Math.trunc((used * 100) / max);

  if (ratio <= 10) return 70;
  if (ratio <= 30) return 60;
  if (ratio <= 50) return 50;
  return 40;
}

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

/** Shift on the `+` adds ten, Ctrl every point that is left. */
const SHIFT_AMOUNT = 10;

const StatRow = observer(
  ({
    label,
    value,
    y,
    stat,
    details,
    detailX = DETAIL_X,
    firstDy = DETAIL_FIRST_DY,
  }: {
    label: string;
    value: number;
    y: number;
    stat: StatType;
    details: DetailLine[];
    detailX?: number;
    firstDy?: number;
  }) => {
    const points = Store.playerData.points;
    const hasPoints = points > 0;
    const amounts = GameOptions.statPointAmounts;

    const run = StatAllocation.run;
    const mine = run !== null && run.stat === stat;
    const elsewhere = run !== null && !mine;

    const [amount, setAmount] = useState('');
    // MuButton hands its handler no event, and the modifier is only known at
    // the press.
    const held = useRef({ shift: false, ctrl: false });

    const press = () => {
      if (!amounts) {
        Store.increaseStatRequest(stat);
        return;
      }
      if (mine) {
        StatAllocation.cancel();
        return;
      }
      if (elsewhere) return;

      const { shift, ctrl } = held.current;
      const typed = Number(amount || '1');
      StatAllocation.start(stat, ctrl ? points : shift ? SHIFT_AMOUNT : typed);
    };

    return (
      <>
        <MuSpriteFrame
          file={ROW_SPRITE}
          width={ROW_WIDTH}
          height={ROW_HEIGHT}
          style={{ position: 'absolute', left: ROW_X, top: y }}
        />

        <div
          className="stat-label"
          style={{
            left: LABEL_X,
            top: y,
            width: LABEL_WIDTH,
            height: ROW_FIELD_HEIGHT,
          }}
        >
          {label}
        </div>
        <div
          className="stat-label"
          style={{
            left: VALUE_X,
            top: y,
            width: hasPoints && amounts ? VALUE_WIDTH_WITH_AMOUNT : VALUE_WIDTH,
            height: ROW_FIELD_HEIGHT,
          }}
        >
          {value}
        </div>

        {hasPoints && amounts && (
          <input
            className="stat-amount"
            data-no-drag="true"
            inputMode="numeric"
            spellCheck={false}
            title={t('charInfo.addAmount')}
            // While this row is the one being filled the box says what the
            // run is for, which is not always what is typed in it (Shift and
            // Ctrl on the `+` pick their own amount).
            value={mine ? String(run.wanted) : amount}
            disabled={run !== null}
            style={{
              left: AMOUNT_X,
              top: y + AMOUNT_DY,
              width: AMOUNT_WIDTH,
              height: AMOUNT_HEIGHT,
            }}
            onChange={event =>
              setAmount(digitsOnly(event.target.value).slice(0, AMOUNT_MAX_DIGITS))
            }
            onKeyDown={event => {
              if (event.key === 'Enter') press();
              else if (event.key === 'Escape') StatAllocation.cancel();
              else return;
              event.preventDefault();
              event.stopPropagation();
            }}
          />
        )}

        {}
        {hasPoints && (
          <div
            className="stat-button"
            data-no-drag="true"
            style={{ left: STAT_BUTTON_X, top: y + STAT_BUTTON_DY }}
            onPointerDown={event => {
              held.current = { shift: event.shiftKey, ctrl: event.ctrlKey };
            }}
          >
            <MuButton
              file={STAT_BUTTON_SPRITE}
              width={STAT_BUTTON_WIDTH}
              height={STAT_BUTTON_HEIGHT}
              frames={mine ? STOP_BUTTON_FRAMES : BUTTON_FRAMES}
              disabled={elsewhere}
              onClick={press}
            >
              {mine && (
                <span className="button-tooltip">{t('charInfo.stopAdding')}</span>
              )}
            </MuButton>
          </div>
        )}

        {details.map((line, i) => (
          <div
            key={i}
            className="stat-detail"
            style={{
              left: detailX,
              top: y + firstDy + i * DETAIL_LINE_HEIGHT,
              color: line.color,
              maxWidth: WIN_WIDTH - detailX - 8,
            }}
          >
            {line.text}
          </div>
        ))}
      </>
    );
  }
);

const WindowButton = ({
  x,
  file,
  tooltip,
  disabled,
  onClick,
}: {
  x: number;
  file: string;
  tooltip: string;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <div
    className="window-button"
    data-no-drag="true"
    style={{ left: x, top: BUTTON_Y }}
  >
    <MuButton
      file={file}
      width={BUTTON_WIDTH}
      height={BUTTON_HEIGHT}
      frames={BUTTON_FRAMES}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="button-tooltip">{tooltip}</span>
    </MuButton>
  </div>
);

/**
 * Dev-only staging for the offline demo: `?statPoints=500` opens the window
 * on a character with that many free points, `&statRun=200` starts a run on
 * Strength as well.
 */
function stageStatPoints(): (() => void) | undefined {
  const points = devQueryNumber('statPoints');
  if (points === null) return;

  runInAction(() => {
    Store.playerData.points = points;
    Store.characterInfoEnabled = true;
  });

  const wanted = devQueryNumber('statRun');
  if (wanted === null) return;

  // The map is still being warped into when this mounts, and arriving is one
  // of the things that ends a run.
  const begin = () => {
    EventBus.off('warpCompleted', begin);
    StatAllocation.start(StatType.Strength, wanted);
  };
  EventBus.on('warpCompleted', begin);

  return () => EventBus.off('warpCompleted', begin);
}

export const CharacterInfo = observer(() => {
  const playerData = Store.playerData;
  const run = StatAllocation.run;

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      Store.characterInfoEnabled = !Store.characterInfoEnabled;
    }
  });

  const open = Store.characterInfoEnabled;

  // A run belongs to the open window: closing it is one of the stops.
  useEffect(() => {
    if (!open) StatAllocation.cancel();
  }, [open]);

  useEffect(() => stageStatPoints(), []);

  if (!open) {
    return null;
  }

  const base = getBaseClass(playerData.charClass);

  const stats = deriveCharacterStats({
    charClass: playerData.charClass,
    level: playerData.level,
    strength: playerData.str,
    agility: playerData.agi,
    vitality: playerData.sta,
    energy: playerData.eng,
    leadership: playerData.leadership,
    items: playerData.items,
  });

  const strengthDetails: DetailLine[] = [];

  const damageMin = Math.min(stats.damageMin, stats.damageMax);
  strengthDetails.push({
    text:
      stats.attackRate > 0
        ? t('charInfo.dmgRate', {
            min: damageMin,
            max: stats.damageMax,
            rate: stats.attackRate,
          })
        : t('charInfo.dmg', { min: damageMin, max: stats.damageMax }),
    color: stats.dualWield ? TEXT_COLOR.buffed : TEXT_COLOR.white,
  });

  if (stats.attackRatePvp > 0) {
    strengthDetails.push({
      text: t('charInfo.attackRate', { value: stats.attackRatePvp }),
    });
  }

  const armourSlots = [
    InventoryConstants.HelmSlot,
    InventoryConstants.ArmorSlot,
    InventoryConstants.PantsSlot,
    InventoryConstants.GlovesSlot,
    InventoryConstants.BootsSlot,
  ];

  const fullSet = armourSlots.every(slot => {
    if (base === BaseClass.MagicGladiator && slot === InventoryConstants.HelmSlot) {
      return true;
    }
    if (base === BaseClass.RageFighter && slot === InventoryConstants.GlovesSlot) {
      return true;
    }
    return !!playerData.items[slot];
  });

  const agilityDetails: DetailLine[] = [];

  if (stats.defenseRate > 0) {
    agilityDetails.push({
      text: fullSet
        ? t('charInfo.defenseRateFull', {
            defense: stats.defense,
            rate: stats.defenseRate,
            bonus: Math.trunc(stats.defenseRate / 10),
          })
        : t('charInfo.defenseRate', {
            defense: stats.defense,
            rate: stats.defenseRate,
          }),
    });
  } else {
    agilityDetails.push({
      text: fullSet
        ? t('charInfo.defenseFull', {
            defense: stats.defense,
            bonus: Math.trunc(stats.defense / 10),
          })
        : t('charInfo.defense', { defense: stats.defense }),
    });
  }

  if (stats.defenseRatePvp > 0) {
    agilityDetails.push({
      text: t('charInfo.defenseRatePvp', { value: stats.defenseRatePvp }),
    });
  }

  const vitalityDetails: DetailLine[] = [
    {
      text: t('charInfo.hp', {
        current: playerData.currentHP,
        max: playerData.maxHP,
      }),
    },
  ];

  if (base === BaseClass.RageFighter) {
    vitalityDetails.push({
      text: t('charInfo.meleeDamage', {
        value: 50 + Math.trunc(playerData.sta / 10),
      }),
    });
  }

  const energyDetails: DetailLine[] = [
    {
      text: t('charInfo.mana', {
        current: playerData.currentMP,
        max: playerData.maxMP,
      }),
    },
  ];

  if (
    base === BaseClass.Wizard ||
    base === BaseClass.MagicGladiator ||
    base === BaseClass.Summoner
  ) {
    energyDetails.push({
      text:
        stats.staffRate > 0
          ? t('charInfo.wizardryRate', {
              min: stats.wizardryMin,
              max: stats.wizardryMax,
              rate: stats.staffRate,
            })
          : t('charInfo.wizardry', {
              min: stats.wizardryMin,
              max: stats.wizardryMax,
            }),
    });
  }

  if (base === BaseClass.Summoner) {
    energyDetails.push({
      text: t('charInfo.curseSpell', {
        min: stats.curseMin,
        max: stats.curseMax,
      }),
    });
  }

  if (base === BaseClass.Knight) {
    energyDetails.push({
      text: t('charInfo.skillDamage', {
        value: 200 + Math.trunc(playerData.eng / 10),
      }),
    });
  } else if (base === BaseClass.MagicGladiator) {
    energyDetails.push({ text: t('charInfo.skillDamage', { value: 200 }) });
  } else if (base === BaseClass.DarkLord) {
    energyDetails.push({
      text: t('charInfo.skillDamage', {
        value: 200 + Math.trunc(playerData.eng / 20),
      }),
    });
  } else if (base === BaseClass.RageFighter) {
    energyDetails.push({
      text: t('charInfo.divineDamage', {
        value: 50 + Math.trunc(playerData.eng / 10),
      }),
    });
    energyDetails.push({
      text: t('charInfo.aoeDamage', {
        value: 100 + Math.trunc(playerData.agi / 8 + playerData.eng / 10),
      }),
    });
  }

  const addProbability = fruitProbability(
    playerData.usedFruitPoints,
    playerData.maxFruitPoints
  );
  const minusProbability = fruitProbability(
    playerData.usedNegativeFruitPoints,
    playerData.maxNegativeFruitPoints
  );

  const close = () => (Store.characterInfoEnabled = false);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="character-info"
      column={0}
      label={t('characterInfo.title')}
      onClose={() => {
        Store.characterInfoEnabled = false;
      }}
    >
      {}
      {/* `SetPlayerColor(Hero->PK)` (NewUICharacterInfoWindow.cpp:272); the
          default look is kept for the neutral state. */}
      <div
        className="character-name"
        style={{
          top: NAME_Y,
          ...(playerData.heroState !== PVP_NEUTRAL
            ? { color: pkTextColour(playerData.heroState) }
            : {}),
        }}
      >
        {playerData.name}
      </div>
      <div className="character-class" style={{ top: CLASS_Y }}>
        ({getClassName(playerData.charClass)})
      </div>

      {}
      <div
        className="head-close"
        data-no-drag="true"
        style={{
          left: HEAD_CLOSE_X,
          top: HEAD_CLOSE_Y,
          width: HEAD_CLOSE_WIDTH,
          height: HEAD_CLOSE_HEIGHT,
        }}
        onClick={close}
      />

      <div
        className="table-fill"
        style={{
          left: TABLE_X,
          top: TABLE_Y,
          width: TABLE_FILL_WIDTH,
          height: TABLE_FILL_HEIGHT,
        }}
      />
      <MuTableFrame
        left={TABLE_X}
        top={TABLE_Y}
        width={TABLE_WIDTH}
        height={TABLE_HEIGHT}
      />
      <MuTableRule
        left={TABLE_RULE_X}
        top={TABLE_RULE_Y}
        width={TABLE_RULE_WIDTH}
      />

      {}
      <div
        className="table-text centred"
        style={{
          left: TABLE_TEXT_X,
          top: LEVEL_FIELD_Y,
          height: LEVEL_FIELD_HEIGHT,
          color: TEXT_COLOR.stat,
        }}
      >
        Level: {playerData.level}
      </div>
      {playerData.points > 0 && (
        <div
          className="table-text centred"
          style={{
            ...(run
              ? { right: POINTS_RUN_RIGHT }
              : { left: POINTS_X }),
            top: LEVEL_FIELD_Y,
            height: LEVEL_FIELD_HEIGHT,
            color: TEXT_COLOR.points,
          }}
        >
          {run
            ? `${playerData.points} (${run.added}/${run.wanted})`
            : `Point: ${playerData.points}`}
        </div>
      )}
      <div
        className="table-text thin"
        style={{ left: TABLE_TEXT_X, top: EXP_Y, color: TEXT_COLOR.white }}
      >
        Exp : {playerData.exp}/{playerData.expToNextLvl}
      </div>
      <div
        className="table-text thin"
        style={{
          left: TABLE_TEXT_X,
          top: PROBABILITY_Y,
          color: TEXT_COLOR.cyan,
        }}
      >
        [+]:{addProbability}%|[-]:{minusProbability}%
      </div>
      <div
        className="table-text thin"
        style={{ left: TABLE_TEXT_X, top: POINT_Y, color: TEXT_COLOR.cyan }}
      >
        Create {playerData.usedFruitPoints}/{playerData.maxFruitPoints} |
        Decrease {-playerData.usedNegativeFruitPoints}/
        {-playerData.maxNegativeFruitPoints}
      </div>

      <StatRow
        label={t('stat.short.strength')}
        value={playerData.str}
        y={ROW_Y.strength}
        stat={StatType.Strength}
        details={strengthDetails}
        firstDy={DETAIL_FIRST_DY_STRENGTH}
      />
      <StatRow
        label={t('stat.short.agility')}
        value={playerData.agi}
        y={ROW_Y.agility}
        stat={StatType.Agility}
        details={agilityDetails}
      />
      <StatRow
        label={t('stat.short.vitality')}
        value={playerData.sta}
        y={ROW_Y.vitality}
        stat={StatType.Vitality}
        details={vitalityDetails}
      />
      <StatRow
        label={t('stat.short.energy')}
        value={playerData.eng}
        y={ROW_Y.energy}
        stat={StatType.Energy}
        details={energyDetails}
        detailX={DETAIL_X_ENERGY}
      />
      {}
      {base === BaseClass.DarkLord && (
        <StatRow
          label={t('stat.command')}
          value={playerData.leadership}
          y={ROW_Y.leadership}
          stat={StatType.Leadership}
          details={[]}
        />
      )}

      <WindowButton
        x={EXIT_BUTTON_X}
        file={EXIT_SPRITE}
        tooltip={t(EXIT_TOOLTIP)}
        onClick={close}
      />
      {}
      <WindowButton
        x={QUEST_BUTTON_X}
        file={QUEST_SPRITE}
        tooltip={t(QUEST_TOOLTIP)}
        disabled
      />
      {/* `m_BtnPet` — `Toggle(INTERFACE_PET)`. */}
      <WindowButton
        x={PET_BUTTON_X}
        file={PET_SPRITE}
        tooltip={t(PET_TOOLTIP)}
        onClick={() => togglePetInfoWindow()}
      />
      <WindowButton
        x={MASTER_BUTTON_X}
        file={MASTER_SPRITE}
        tooltip={t(MASTER_TOOLTIP)}
        onClick={() => toggleMasterSkillsWindow()}
      />
    </MuItemWindow>
  );
});
