import { memo, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { Item } from '../../../ecs/world';
import { itemIconKey, itemIconPackChain } from '../../../common/itemIconPack';
import { ITEM_ICON_FIT } from '../../../common/itemIconFit';

/**
 * `<img fetchpriority>` is not a React 18 prop (it arrives with React 19), so
 * it goes to the DOM as a plain lowercase attribute. High: an icon is what the
 * player is waiting on; the world's model / texture fetches are already high
 * and would otherwise starve it (see itemIconPack.ts).
 */
const IMG_PRIORITY = { fetchpriority: 'high' } as const;

/**
 * The pack renders every item at one world scale into a canvas sized by its
 * inventory footprint, so a small item covers a small part of its own PNG and
 * fitting that canvas to the square left a jewel a few pixels across. The
 * measured zoom (tools/itemIconFit.ts) blows the opaque box back up to the
 * square; the translate takes off the render's drift off centre first, since
 * the zoom is about the canvas centre and would scale that drift too.
 *
 * The zoom never overflows: it is capped by the canvas, and the canvas is
 * what `max-width/height: 100%` has already fitted into the box.
 */
function fitTransform(item: { group: number; num: number }): string | undefined {
  const fit = ITEM_ICON_FIT[`${item.group}_${item.num}`];
  if (!fit) return undefined;
  const [zoom, dx, dy] = fit;
  return `scale(${zoom}) translate(${dx * 100}%, ${dy * 100}%)`;
}

/**
 * An item's icon from the pre-rendered pack (itemIconPack.ts).
 *
 * An observer leaf taking the item itself: only the fields the file name
 * depends on (`itemIconKey`) are read here, so a durability tick or an
 * option change on one item re-renders nothing - the grid above passes the
 * same `item` reference and this memo skips. (The old `{...item}` spread
 * subscribed the whole grid to all fourteen fields of every item.)
 */
export const ItemIcon = memo(
  observer(function ItemIcon({ item }: { item: Item }) {
    const key = itemIconKey(item);
    /** Which URL of the pack chain is showing; past the end = no file at all. */
    const [fallbackStep, setFallbackStep] = useState(0);
    useEffect(() => {
      setFallbackStep(0);
    }, [key]);
    const chain = itemIconPackChain(item);

    if (fallbackStep >= chain.length) {
      return (
        <div
          className="item-icon item-icon-missing"
          title={`item ${item.group}/${item.num}`}
        />
      );
    }

    return (
      <img
        src={chain[fallbackStep]}
        className="item-icon"
        style={{ transform: fitTransform(item) }}
        alt=""
        draggable={false}
        decoding="async"
        {...IMG_PRIORITY}
        onError={() => setFallbackStep(step => step + 1)}
      />
    );
  })
);
