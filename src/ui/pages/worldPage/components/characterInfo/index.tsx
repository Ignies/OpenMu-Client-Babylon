import { isKey } from '../../../../../common/keyBindings';
import { t } from '../../../../../i18n';
import './style.less';
import { observer } from 'mobx-react-lite';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { Store } from '../../../../../store';
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
    const hasPoints = Store.playerData.points > 0;

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
            width: VALUE_WIDTH,
            height: ROW_FIELD_HEIGHT,
          }}
        >
          {value}
        </div>

        {}
        {hasPoints && (
          <div
            className="stat-button"
            data-no-drag="true"
            style={{ left: STAT_BUTTON_X, top: y + STAT_BUTTON_DY }}
          >
            <MuButton
              file={STAT_BUTTON_SPRITE}
              width={STAT_BUTTON_WIDTH}
              height={STAT_BUTTON_HEIGHT}
              frames={BUTTON_FRAMES}
              onClick={() => Store.increaseStatRequest(stat)}
            />
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

export const CharacterInfo = observer(() => {
  const playerData = Store.playerData;

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      Store.characterInfoEnabled = !Store.characterInfoEnabled;
    }
  });

  if (!Store.characterInfoEnabled) {
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
            left: POINTS_X,
            top: LEVEL_FIELD_Y,
            height: LEVEL_FIELD_HEIGHT,
            color: TEXT_COLOR.points,
          }}
        >
          Point: {playerData.points}
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
