/**
 * The right button counts as "held" until the scene sees its POINTERUP. A release over an HTML
 * window (inventory, chat, ...) or outside the canvas never reaches the scene, so the flag stays
 * true and every mouse move re-arms a cast at the hovered object. `buttons` is the browser's own
 * bitmask of what is physically down (bit 1 = right).
 */
export const RIGHT_BUTTON_MASK = 2;

/** True when the right button is flagged as held but the browser says it is up. */
export function rightButtonStuck(flagged: boolean, buttons: number): boolean {
  return flagged && (buttons & RIGHT_BUTTON_MASK) === 0;
}
