import './style.less';
import { observer } from 'mobx-react-lite';
import { useLayoutEffect, useRef } from 'react';
import { Store } from '../../../store';
import { ItemsDatabase } from '../../../common/itemsDatabase';
import { ItemIcon } from '../itemIcon';
import { MuWindows } from '../muWindow/windowState';
import { SQUARE } from '../itemGrid';

/**
 * The last place the pointer was pressed or moved. Tracked at all times so
 * the picked item can appear under the cursor on the very click that lifted
 * it — on touch there is no `pointermove` before the tap, and waiting for
 * one left the item invisible until the finger moved.
 */
const lastPointer = { x: -10000, y: -10000 };

if (typeof window !== 'undefined') {
  const track = (event: PointerEvent) => {
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
  };
  window.addEventListener('pointerdown', track, { capture: true, passive: true });
  window.addEventListener('pointermove', track, { capture: true, passive: true });
}

/**
 * `CNewUIPickedItem`: the item hanging off the cursor. It belongs to no
 * window in the original either - it survives the inventory being hidden and
 * follows the mouse over the vault, the trade tray and the world.
 *
 * Renders once per pick: the position is written straight to the element's
 * `transform` on every pointer move (no state, no React render per event).
 */
export const PickedItemCursor = observer(() => {
  const picked = Store.pickedItem;
  const ref = useRef<HTMLDivElement>(null);
  const item = picked?.item ?? null;

  const config = item ? ItemsDatabase.getItem(item.group, item.num) : null;
  const w = config?.X ?? 1;
  const h = config?.Y ?? 1;

  // The icon is drawn at the scale of the window it came out of.
  const square = SQUARE * MuWindows.scaleOf('inventory');
  const width = w * square;
  const height = h * square;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !item) return;

    const moveTo = (x: number, y: number) => {
      el.style.transform = `translate(${x - width / 2}px, ${y - height / 2}px)`;
    };

    moveTo(lastPointer.x, lastPointer.y);

    let frame = 0;
    let next: { x: number; y: number } | null = null;
    const onMove = (event: PointerEvent) => {
      next = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (next) moveTo(next.x, next.y);
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [item, width, height]);

  if (!item) return null;

  return (
    <div
      ref={ref}
      className="mu-picked-item"
      style={{ left: 0, top: 0, width, height }}
    >
      <ItemIcon item={item} />
    </div>
  );
});
