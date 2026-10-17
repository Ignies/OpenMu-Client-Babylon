import { observer } from 'mobx-react-lite';
import type { Item } from '@/ecs/world';
import { stackCount } from '@/controllers/item_rules';
import { MuNumber } from '@/controllers/interface/components/mu_number';

type Stackable = Pick<Item, 'group' | 'num' | 'lvl' | 'durability'>;

/** `RenderNumberOfItem`: the count at x + width - 6, y + 1 of the item (NewUIInventoryCtrl.cpp:1531-1583), or null. */
export function stackNumberAt(item: Stackable, width: number): { value: number; x: number; y: number } | null {
  const value = stackCount(item);
  return value > 1 ? { value, x: width - 6, y: 1 } : null;
}

/** The count in the original's bitmap digits (`RenderNumber`, newui_number1), over an item `width` px wide. */
export const StackNumber = observer(function StackNumber({ item, width }: { item: Stackable; width: number }) {
  const at = stackNumberAt(item, width);
  return at && <MuNumber value={at.value} x={at.x} y={at.y} style={{ pointerEvents: 'none' }} />;
});
