import './style.less';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import type { Item } from '@/ecs/world';
import { Store } from '@/app/store';
import { itemNameColor } from '@/controllers/interface/itemTooltip';
import { ItemTooltip } from '../item_tooltip';

/**
 * An item linked into chat: its name in the tooltip's name colour, and the
 * tooltip itself, picture first, while the pointer is on it. The tooltip
 * sits on `document.body`, so the chat window's scale does not reach it.
 * `label` is the chat module's `itemLinkLabel(item)`, handed in by the caller.
 */
export const ChatItemLink = observer(({ item, label }: { item: Item; label: string }) => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      className={`chat-item-link color-${itemNameColor(item)}`}
      onMouseEnter={e => setAt({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setAt(null)}
    >
      {label}
      {at && !Store.pickedItem && (
        <ItemTooltip item={item} x={at.x} y={at.y} context="plain" picture />
      )}
    </span>
  );
});
