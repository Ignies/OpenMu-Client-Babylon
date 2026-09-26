import { Store } from '../../../../../store';
import { Social } from '../../../../../social';
import { ItemLinkHover } from '../../../../../common/itemLinkHover';
import { itemLinkLabel, itemLinkToken } from '../../../../../common/chatItemLinks';

/**
 * Alt+click on any item whose tooltip is up links it into chat
 * (`ItemLinkHover`, written by `ItemTooltip`). Caught on the window in the
 * capture phase so no window underneath picks, buys or repairs the item, and
 * the rest of the gesture (mousedown, which would take the chat field's
 * focus, and click, which the cash shop acts on) is swallowed with it.
 */
export function installItemLinkGesture(): () => void {
  let armed = false;

  const onPointerDown = (e: PointerEvent) => {
    armed = false;
    if (e.button !== 0 || !e.altKey) return;
    const item = ItemLinkHover.item;
    if (!item || Store.pickedItem || Store.msgWin) return;
    e.stopPropagation();
    armed = true;
    ItemLinkHover.linkedDuringAlt = true;
    Social.insertIntoChat({ label: itemLinkLabel(item), token: itemLinkToken(item) });
  };

  const swallow = (e: Event) => {
    if (!armed) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.type === 'click') armed = false;
  };

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('mousedown', swallow, true);
  window.addEventListener('mouseup', swallow, true);
  window.addEventListener('click', swallow, true);
  return () => {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('mousedown', swallow, true);
    window.removeEventListener('mouseup', swallow, true);
    window.removeEventListener('click', swallow, true);
  };
}
