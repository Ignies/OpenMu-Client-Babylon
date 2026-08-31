import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { PET_GROUP } from '../../../../../common/pets';
import { PetCommandModeEnum } from '../../../../../common/packets/ClientToServerPackets';
import { uiClick } from '../../../../../libs/sfx';
import { MuSpriteFrame } from '../../../../components/muSprite';

/**
 * `CNewUISkillList::RenderPetSkill` + `giPetManager::SendPetCommand`: the four
 * Dark Raven command boxes at (353, 352) on the 640×480 screen, drawn only
 * while a raven sits in the left hand (`Hero->m_pPet`). A click sends the
 * command straight away (the original selects it and fires on right click);
 * Target takes the hero's current attack target. The lit box is the mode the
 * server confirmed with `PetMode` (`IMAGE_SKILLBOX_USE`).
 */

/** `x = 353, y = 352, width = 32, height = 38` (NewUIMainFrameWindow.cpp:2071). */
const PET_BAR_X = 353;
const PET_BAR_Y = 352;
const BOX_WIDTH = 32;
const BOX_HEIGHT = 38;
/** `newui_skillbox.jpg`: the plain box; `newui_skillbox2` the lit one. */
const BOX_SPRITE = 'newui_skillbox.OZJ';
const BOX_USE_SPRITE = 'newui_skillbox2.OZJ';
/** Dark Raven: group 13 index 5, worn in the left hand. */
const DARK_RAVEN_INDEX = 5;
/** `kInvalidTargetKey`. */
const NO_TARGET = 0xffff;

/** `AT_PET_COMMAND_DEFAULT..TARGET` in bar order, with the packet mode of each. */
const COMMANDS: readonly {
  mode: PetCommandModeEnum;
  labelKey: TextKey;
  tipKey: TextKey;
}[] = [
  { mode: PetCommandModeEnum.Normal, labelKey: 'bottomBar.pet.normal', tipKey: 'bottomBar.pet.normalTip' },
  { mode: PetCommandModeEnum.AttackRandom, labelKey: 'bottomBar.pet.random', tipKey: 'bottomBar.pet.randomTip' },
  { mode: PetCommandModeEnum.AttackWithOwner, labelKey: 'bottomBar.pet.owner', tipKey: 'bottomBar.pet.ownerTip' },
  { mode: PetCommandModeEnum.AttackTarget, labelKey: 'bottomBar.pet.target', tipKey: 'bottomBar.pet.targetTip' },
];

/** The bottom bar's local Y of a 640×480 screen Y. */
const BAR_TOP = 480 - 51;

export function ravenEquipped(): boolean {
  const item = Store.playerData.items[InventoryConstants.LeftHandSlot];
  return !!item && item.group === PET_GROUP && item.num === DARK_RAVEN_INDEX;
}

function sendCommand(mode: PetCommandModeEnum): void {
  let target = NO_TARGET;
  if (mode === PetCommandModeEnum.AttackTarget) {
    target = Store.world?.attackTarget?.netId ?? NO_TARGET;
    if (target === NO_TARGET) {
      Store.addNotification(t('bottomBar.pet.needTarget'), 'error');
      return;
    }
  }
  Store.sendPetCommand(mode, target);
}

export const PetCommandBar = observer(() => {
  if (!ravenEquipped()) return null;
  const current = Store.petMode;

  return (
    <>
      {COMMANDS.map((command, i) => (
        <div
          key={command.mode}
          className={`pet-command${current === command.mode ? ' selected' : ''}`}
          title={t(command.tipKey)}
          style={{
            left: PET_BAR_X + i * BOX_WIDTH,
            top: PET_BAR_Y - BAR_TOP,
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
          }}
          onPointerDown={e => e.stopPropagation()}
          onClick={uiClick(() => sendCommand(command.mode))}
        >
          <MuSpriteFrame
            file={current === command.mode ? BOX_USE_SPRITE : BOX_SPRITE}
            width={BOX_WIDTH}
            height={BOX_HEIGHT}
            style={{ position: 'absolute', left: 0, top: 0 }}
          />
          <span>{t(command.labelKey)}</span>
        </div>
      ))}
    </>
  );
});
