import './style.less';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { t, type TextKey } from '../../../../../i18n';
import { Store, type PetInfo } from '../../../../../store';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { PET_GROUP, DARK_HORSE, DARK_RAVEN } from '../../../../../common/pets';
import {
  PetCommandModeEnum,
  PetTypeEnum,
} from '../../../../../common/packets/ClientToServerPackets';
import { uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { sendRavenCommand } from '../bottomBar/petCommands';
import { PetInfoWindowState, togglePetInfoWindow } from './windowState';

/**
 * `CNewUIPetInfoWindow` (NewUIPetInfoWindow.cpp): the Dark Horse / Dark Raven
 * sheet in the item-window frame. Two `newui_guild_tab04` tabs, then per pet a
 * group box with level, life (+ the `newui_pet_lifebar` trough), experience
 * toward the next level and the derived combat lines (`giPetManager::
 * CalcPetInfo`); the raven adds its four command boxes, lit like the bottom
 * bar's and clickable the same way. Opened from the character sheet's Pet
 * button (`m_BtnPet` -> `Toggle(INTERFACE_PET)`); the level / exp / life
 * arrive through `PetInfoRequest` -> `PetInfoResponse`, asked for on open.
 */

const WINDOW_ID = 'pet-info';

const TITLE_Y = 12;
const NAME_Y = 25;
/** The X in the frame art. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

/** `m_BtnTab.ChangeRadioButtonInfo(true, x+12, y+48, 56, 22)`. */
const TAB = { x: 12, y: 48, width: 56, height: 22 };
const TAB_SPRITE = 'newui_guild_tab04.OZT';

/** The stats group box: (12, 75), 168 wide, 105 tall (121 with defense). */
const BOX = { x: 12, y: 75, width: 168 };
const BOX_HEIGHT_HORSE = 105;
const BOX_HEIGHT_RAVEN = 121;
const LEVEL_Y = 8;
const LIFE_TEXT_Y = 28;
const LIFE_BAR = { dx: 7, dy: 40, width: 151, height: 12 };
const LIFE_FILL = { dx: 9, dy: 42, width: 147, height: 8 };
const EXP_Y = 59;
const DAMAGE_Y = 72;
const SPEED_Y = 85;
const DEFENSE_Y = 98;

/** The raven's command group box: (12, 196), 168 x 195. */
const CMD_BOX = { x: 12, y: 196, width: 168, height: 195 };
const CMD_TITLE_Y = 8;
const CMD_ROW_DY = 28;
const CMD_ROW_HEIGHT = 40;
const CMD_SLOT = { dx: 10, width: 32, height: 38 };
const CMD_ICON = { dx: 7, dy: 6, width: 19, height: 27 };
const CMD_LABEL_X = 50;

const NOT_EQUIPPED = { x: 15, y: 100, width: 160 };

const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
const EXIT_SPRITE = 'newui_exit_00.OZT';
const LIFE_BAR_SPRITE = 'Newui_Pet_Lifebar01.OZJ';
const LIFE_FILL_SPRITE = 'Newui_Pet_Lifebar02.OZJ';
const BOX_SPRITE = 'newui_skillbox.OZJ';
const BOX_USE_SPRITE = 'newui_skillbox2.OZJ';
const CMD_ICON_SPRITE = 'newui_command.OZJ';

/** `m_wLife` is durability as life, out of 255 (`GlobalText[358]`). */
const PET_MAX_LIFE = 255;

/** `AT_PET_COMMAND_DEFAULT..TARGET` with the `newui_command` icon of each. */
const COMMANDS: readonly {
  mode: PetCommandModeEnum;
  labelKey: TextKey;
  tipKey: TextKey;
}[] = [
  { mode: PetCommandModeEnum.Normal, labelKey: 'petInfo.cmdNormal', tipKey: 'bottomBar.pet.normalTip' },
  { mode: PetCommandModeEnum.AttackRandom, labelKey: 'petInfo.cmdRandom', tipKey: 'bottomBar.pet.randomTip' },
  { mode: PetCommandModeEnum.AttackWithOwner, labelKey: 'petInfo.cmdOwner', tipKey: 'bottomBar.pet.ownerTip' },
  { mode: PetCommandModeEnum.AttackTarget, labelKey: 'petInfo.cmdTarget', tipKey: 'bottomBar.pet.targetTip' },
];

const TABS: readonly { pet: PetTypeEnum; nameKey: TextKey }[] = [
  { pet: PetTypeEnum.DarkHorse, nameKey: 'petInfo.darkHorse' },
  { pet: PetTypeEnum.DarkRaven, nameKey: 'petInfo.darkRaven' },
];

function equippedSlotOf(pet: PetTypeEnum): number | null {
  const slot =
    pet === PetTypeEnum.DarkHorse
      ? InventoryConstants.PetSlot
      : InventoryConstants.LeftHandSlot;
  const num = pet === PetTypeEnum.DarkHorse ? DARK_HORSE : DARK_RAVEN;
  const item = Store.playerData.items[slot];
  return item && item.group === PET_GROUP && item.num === num ? slot : null;
}

/**
 * `giPetManager::CalcPetInfo`: the lines the server does not send, derived
 * from the pet's level and the hero's stats. Charisma is the Dark Lord's
 * leadership. The original also folds Earthshake's skill damage (horse) and
 * the scepter's rise percent (raven) into the damage line; those two bonuses
 * are left out here.
 */
function derived(pet: PetTypeEnum, info: PetInfo) {
  const charisma = Store.playerData.leadership;
  const strength = Store.playerData.str;
  const level = info.level;
  const next = level + 1;

  const expNext = (10 + next) * next * next * next * 100;
  const speed = 20 + Math.trunc((level * 4) / 5) + Math.trunc(charisma / 50);
  const rate = 1000 + level + level * 15;

  if (pet === PetTypeEnum.DarkRaven) {
    return {
      expNext,
      speed,
      rate,
      damageMin: 180 + level * 15 + Math.trunc(charisma / 8),
      damageMax: 200 + level * 15 + Math.trunc(charisma / 4),
      defense: 185 + level * 15,
    };
  }

  const damageMin =
    Math.trunc(strength / 10) + Math.trunc(charisma / 10) + level * 5;
  return {
    expNext,
    speed,
    rate,
    damageMin,
    damageMax: damageMin + Math.trunc(damageMin / 2),
    defense: null,
  };
}

const StatsBox = observer(({ pet }: { pet: PetTypeEnum }) => {
  const raven = pet === PetTypeEnum.DarkRaven;
  const height = raven ? BOX_HEIGHT_RAVEN : BOX_HEIGHT_HORSE;
  const info = Store.petInfoByPet[pet];

  if (!info) {
    return (
      <div
        className="pet-waiting"
        style={{ left: BOX.x + 4, top: BOX.y + 30, width: BOX.width - 8 }}
      >
        {t('petInfo.waiting')}
      </div>
    );
  }

  const stats = derived(pet, info);
  const life = Math.min(info.health, PET_MAX_LIFE);
  // `int iHP = (min(life, 255) * 147) / 255` — filled pixels, not a ratio.
  const filled = Math.trunc((life * LIFE_FILL.width) / PET_MAX_LIFE);

  const row = (top: number, text: string, className = 'pet-row') => (
    <div
      className={className}
      style={{ left: BOX.x, top: BOX.y + top, width: BOX.width }}
    >
      {text}
    </div>
  );

  return (
    <>
      <div
        className="table-fill"
        style={{ left: BOX.x, top: BOX.y, width: BOX.width, height }}
      />
      <MuTableFrame left={BOX.x} top={BOX.y} width={BOX.width} height={height} />

      {row(LEVEL_Y, t('petInfo.level', { level: info.level }), 'pet-level')}
      {row(
        LIFE_TEXT_Y,
        t('petInfo.life', { current: life, max: PET_MAX_LIFE })
      )}

      <MuSpriteFrame
        file={LIFE_BAR_SPRITE}
        width={LIFE_BAR.width}
        height={LIFE_BAR.height}
        className="pet-lifebar"
        style={{
          left: BOX.x + LIFE_BAR.dx,
          top: BOX.y + LIFE_BAR.dy,
          backgroundSize: '100% 100%',
        }}
      >
        {filled > 0 && (
          <MuSpriteFrame
            file={LIFE_FILL_SPRITE}
            width={filled}
            height={LIFE_FILL.height}
            className="pet-lifebar-fill"
            style={{
              left: LIFE_FILL.dx - LIFE_BAR.dx,
              top: LIFE_FILL.dy - LIFE_BAR.dy,
              backgroundSize: '100% 100%',
            }}
          />
        )}
      </MuSpriteFrame>

      {row(
        EXP_Y,
        t('petInfo.exp', {
          current: info.experience.toLocaleString('en-US'),
          next: stats.expNext.toLocaleString('en-US'),
        })
      )}
      {row(
        DAMAGE_Y,
        t('petInfo.damage', {
          min: stats.damageMin,
          max: stats.damageMax,
          rate: stats.rate,
        })
      )}
      {row(SPEED_Y, t('petInfo.attackSpeed', { speed: stats.speed }))}
      {stats.defense !== null &&
        row(DEFENSE_Y, t('petInfo.defense', { defense: stats.defense }))}
    </>
  );
});

/** The raven's command boxes — the bottom bar's four, in window clothes. */
const CommandBox = observer(() => {
  const current = Store.petMode;

  return (
    <>
      <div
        className="table-fill"
        style={{
          left: CMD_BOX.x,
          top: CMD_BOX.y,
          width: CMD_BOX.width,
          height: CMD_BOX.height,
        }}
      />
      <MuTableFrame {...{ left: CMD_BOX.x, top: CMD_BOX.y, width: CMD_BOX.width, height: CMD_BOX.height }} />
      <div
        className="pet-level"
        style={{ left: CMD_BOX.x, top: CMD_BOX.y + CMD_TITLE_Y, width: CMD_BOX.width }}
      >
        {t('petInfo.command')}
      </div>

      {COMMANDS.map((command, i) => {
        const top = CMD_BOX.y + CMD_ROW_DY + i * CMD_ROW_HEIGHT;
        const selected = current === command.mode;
        return (
          <div key={command.mode}>
            <div
              className={`pet-cmd-slot${selected ? ' selected' : ''}`}
              data-no-drag="true"
              title={t(command.tipKey)}
              style={{
                left: CMD_BOX.x + CMD_SLOT.dx,
                top,
                width: CMD_SLOT.width,
                height: CMD_SLOT.height,
              }}
              onClick={uiClick(() => sendRavenCommand(command.mode))}
            >
              <MuSpriteFrame
                file={selected ? BOX_USE_SPRITE : BOX_SPRITE}
                width={CMD_SLOT.width}
                height={CMD_SLOT.height}
                style={{ position: 'absolute', left: 0, top: 0 }}
              />
              {/* `newui_command.jpg`: the four 19x27 icons at u = 1/21/41/61. */}
              <MuSpriteFrame
                file={CMD_ICON_SPRITE}
                x={1 + i * 20}
                width={CMD_ICON.width}
                height={CMD_ICON.height}
                style={{
                  position: 'absolute',
                  left: CMD_ICON.dx,
                  top: CMD_ICON.dy,
                }}
              />
            </div>
            <div
              className="pet-cmd-label"
              style={{
                left: CMD_BOX.x + CMD_LABEL_X,
                top,
                width: CMD_BOX.width - CMD_LABEL_X - 10,
                height: CMD_SLOT.height,
              }}
            >
              {t(command.labelKey)}
            </div>
          </div>
        );
      })}
    </>
  );
});

export const PetInfoWindow = observer(() => {
  const open = PetInfoWindowState.open;
  const tab = PetInfoWindowState.tab;

  // `SendPetInfoRequest` for the equipped pets when the window comes up, so
  // the level / exp / life lines are fresh (the original refreshes through
  // the server's own pushes on equip / level change).
  useEffect(() => {
    if (!open) return;
    for (const { pet } of TABS) {
      const slot = equippedSlotOf(pet);
      if (slot !== null) Store.requestPetInfo(pet, slot);
    }
  }, [open]);

  if (!open) return null;

  const close = () => togglePetInfoWindow(false);
  const equipped = equippedSlotOf(tab) !== null;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="pet-info-window"
      column={1}
      label={t('petInfo.title')}
      onClose={close}
    >
      <div className="pet-title" style={{ top: TITLE_Y }}>
        {t('petInfo.title')}
      </div>
      <div className="pet-name" style={{ top: NAME_Y }}>
        {t(TABS.find(entry => entry.pet === tab)!.nameKey)}
      </div>
      <div
        className="head-close"
        data-no-drag="true"
        style={HEAD_CLOSE}
        onClick={close}
      />

      {TABS.map((entry, i) => (
        <div
          key={entry.pet}
          data-no-drag="true"
          style={{
            position: 'absolute',
            left: TAB.x + i * TAB.width,
            top: TAB.y,
          }}
        >
          <MuButton
            file={TAB_SPRITE}
            width={TAB.width}
            height={TAB.height}
            frames={{ up: 0, down: 1, check: 1 }}
            checked={tab === entry.pet}
            label={t(entry.nameKey)}
            labelStyle={{ fontSize: 10 }}
            onClick={() =>
              runInAction(() => {
                PetInfoWindowState.tab = entry.pet;
              })
            }
          />
        </div>
      ))}

      {!equipped ? (
        <div
          className="pet-not-equipped"
          style={{ left: NOT_EQUIPPED.x, top: NOT_EQUIPPED.y, width: NOT_EQUIPPED.width }}
        >
          {t('petInfo.notEquipped', {
            pet: t(TABS.find(entry => entry.pet === tab)!.nameKey),
          })}
        </div>
      ) : (
        <>
          <StatsBox pet={tab} />
          {tab === PetTypeEnum.DarkRaven && <CommandBox />}
        </>
      )}

      <div
        data-no-drag="true"
        style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={close}
        />
      </div>
    </MuItemWindow>
  );
});
