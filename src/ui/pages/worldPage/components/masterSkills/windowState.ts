import { observable, runInAction } from 'mobx';
import { gameVersion } from '../../../../../version';

/**
 * Open/closed state of the master skill tree sheet, shared by the hot key,
 * the character sheet's master button and the sheet's own close button.
 */
export const MasterSkillsWindowState = observable({ open: false });

export function toggleMasterSkillsWindow(open?: boolean): void {
  // No master level before Season 3: the hot key / sheet button do nothing.
  if (!gameVersion.features.masterSkills) return;
  runInAction(() => {
    MasterSkillsWindowState.open = open ?? !MasterSkillsWindowState.open;
  });
}
