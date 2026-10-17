import { isOn } from '@/controllers/fidelity';

/** Past this many characters a label outgrows the 108 px button at 11 px. */
const LABEL_FIT = 16;

/**
 * A button label stays on one line, as the original's `RenderText` draws it. Ours, behind
 * `menuLabelFit`: a label past `LABEL_FIT` characters shrinks its font to fit the button.
 */
export function menuLabelStyle(label: string): { whiteSpace: 'nowrap'; fontSize: string | undefined } {
  const shrink = isOn('menuLabelFit') && label.length > LABEL_FIT;
  return { whiteSpace: 'nowrap', fontSize: shrink ? `${Math.max(8, (11 * LABEL_FIT) / label.length).toFixed(1)}px` : undefined };
}
