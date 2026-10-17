import { defineImprovement } from '@/controllers/fidelity';

/**
 * A long Escape menu label shrinks its font to fit the button. Classic: the label keeps its size on
 * one line, as `RenderText` draws it (`CSystemMenuMsgBox`, NewUICustomMessageBox.cpp:2155-2435). Read in
 * `ui/windows/system_menu/labelFit.ts` (`menuLabelStyle`).
 */
export default defineImprovement({
  id: 'menuLabelFit',
  preset: 'enhanced',
  labelKey: 'fidelity.menuLabelFit',
  hintKey: 'fidelity.menuLabelFit.hint',
});
