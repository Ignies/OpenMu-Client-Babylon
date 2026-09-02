import { observable, runInAction } from 'mobx';
import { PetTypeEnum } from '../../../../../common/packets/ClientToServerPackets';

/**
 * Open/closed state of the pet info window (`INTERFACE_PET`), shared by the
 * character sheet's Pet button and the window's own close buttons. `tab` is
 * the open pet tab; the original starts on the Dark Horse
 * (`TAB_TYPE_DARKHORSE`).
 */
export const PetInfoWindowState = observable({
  open: false,
  tab: PetTypeEnum.DarkHorse,
});

export function togglePetInfoWindow(open?: boolean): void {
  runInAction(() => {
    PetInfoWindowState.open = open ?? !PetInfoWindowState.open;
  });
}
