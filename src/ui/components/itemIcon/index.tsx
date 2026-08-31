import { memo, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { Item } from '../../../ecs/world';
import { itemIconKey, itemIconPackChain } from '../../../common/itemIconPack';

/**
 * `<img fetchpriority>` is not a React 18 prop (it arrives with React 19), so
 * it goes to the DOM as a plain lowercase attribute. High: an icon is what the
 * player is waiting on; the world's model / texture fetches are already high
 * and would otherwise starve it (see itemIconPack.ts).
 */
const IMG_PRIORITY = { fetchpriority: 'high' } as const;

/**
 * An item's icon from the pre-rendered pack (itemIconPack.ts).
 *
 * An observer leaf taking the item itself: only the fields the file name
 * depends on (`itemIconKey`) are read here, so a durability tick or an
 * option change on one item re-renders nothing — the grid above passes the
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
        alt=""
        draggable={false}
        decoding="async"
        {...IMG_PRIORITY}
        onError={() => setFallbackStep(step => step + 1)}
      />
    );
  })
);
