import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Item } from '../../../ecs/world';
import { Store } from '../../../store';
import { buildItemTooltip, type TooltipLine } from '../../../common/itemTooltip';
import type { HeroStats } from '../../../common/itemStats';
import { PET_GROUP } from '../../../common/pets';
import { PetTypeEnum } from '../../../common/packets/ClientToServerPackets';
import {
  isRepairBanned,
  isSellingBanned,
  itemValue,
  needsRepair,
  repairCost,
  withTax,
} from '../../../common/itemValue';

/** The hero as `RenderItemInfo` compares against (`CharacterAttribute`). */
export function heroStats(): HeroStats {
  return Store.heroStats();
}

/**
 * Where the item sits: the hero's inventory, a merchant's stock, a player's
 * stall (`TOOLTIP_TYPE_MY_SHOP`) or one of the storage grids, which add no
 * price line of their own.
 */
export type TooltipContext = 'inventory' | 'shop' | 'playerShop' | 'plain';

const zen = (gold: number) => `${gold.toLocaleString('en-US')} Zen`;

/**
 * The price lines `RenderItemInfo` adds while a shop is open (GlobalText
 * 63 / 1620, ZzzInventory.cpp:2228) and the repair line of the repair
 * cursor (`RenderRepairInfo`, GlobalText 238), in the name's colour, right
 * under the name.
 */
function priceLines(
  item: Item,
  context: TooltipContext,
  color: TooltipLine['color'],
  price?: number
): TooltipLine[] {
  const shop = Store.npcShop;
  const lines: TooltipLine[] = [];

  // `CNewUIPurchaseShopInventory`: the seller's asking price, in gold.
  if (context === 'playerShop') {
    lines.push({
      text: price !== undefined && price > 0 ? `Price: ${zen(price)}` : 'No price set',
      color,
      bold: true,
    });
    lines.push({ text: '', color, bold: false, blank: true });
    return lines;
  }

  if (context === 'shop' && shop) {
    const price = itemValue(item, 0);
    const taxed = withTax(price, shop.taxRate);
    lines.push({
      text: shop.taxRate > 0 ? `Price: ${zen(taxed)} (${zen(price)})` : `Price: ${zen(price)}`,
      color,
      bold: false,
    });
  } else if (context === 'inventory' && shop && !isSellingBanned(item)) {
    lines.push({ text: `Sell price: ${zen(itemValue(item, 1))}`, color, bold: false });
  }

  if (context === 'inventory' && Store.repairMode && !isRepairBanned(item)) {
    const cost = needsRepair(item) ? repairCost(item, Store.isSelfRepair) : 0;
    lines.push({ text: `Repair: ${zen(cost)}`, color, bold: true });
  }

  if (lines.length > 0) lines.push({ text: '', color, bold: false, blank: true });

  return lines;
}

// ---- pets (`giPetManager::RenderPetItemInfo`) ------------------------------

/** Item indexes of group 13 that are pets with a level: 4 Dark Horse, 5 Dark Raven. */
const PET_ITEM_TYPE: Readonly<Record<number, PetTypeEnum>> = {
  4: PetTypeEnum.DarkHorse,
  5: PetTypeEnum.DarkRaven,
};
/** `debouncedPetInfoRequest`: one `PetInfoRequest` a second per slot. */
const PET_INFO_REQUEST_INTERVAL_MS = 1000;
/** `m_wLife` is durability as life, out of 255 (`GlobalText[358]`). */
const PET_MAX_LIFE = 255;
const lastPetInfoRequest = new Map<number, number>();

function petTypeOf(item: Item): PetTypeEnum | undefined {
  return item.group === PET_GROUP ? PET_ITEM_TYPE[item.num] : undefined;
}

/** The pet's level / experience / life once `PetInfoResponse` answered for this slot. */
function petLines(pet: PetTypeEnum, slot: number): TooltipLine[] {
  const info = Store.petInfo;
  if (!info || info.pet !== pet || info.slot !== slot) return [];
  return [
    { text: '\n', color: 'white', bold: false, blank: true },
    { text: `Level : ${info.level}`, color: 'white', bold: false },
    { text: `Experience : ${info.experience.toLocaleString('en-US')}`, color: 'white', bold: false },
    { text: `Life : ${Math.min(info.health, PET_MAX_LIFE)} / ${PET_MAX_LIFE}`, color: 'white', bold: false },
  ];
}

// ---- placement --------------------------------------------------------------

const MARGIN = 2;
const BELOW_CURSOR = 16;
const ABOVE_CURSOR = 8;

/**
 * `RenderItemInfo` placement: centred on the cursor's x, hanging below it,
 * flipped above when it would leave the bottom, kept inside the viewport.
 * Pure arithmetic on a measured size so it can run per pointer move without
 * touching layout.
 */
function place(
  x: number,
  y: number,
  width: number,
  height: number
): { left: number; top: number } {
  let left = x - width / 2;
  let top = y + BELOW_CURSOR;

  if (left + width > window.innerWidth - MARGIN) {
    left = window.innerWidth - MARGIN - width;
  }
  if (left < MARGIN) left = MARGIN;

  if (top + height > window.innerHeight - MARGIN) {
    top = y - ABOVE_CURSOR - height;
  }
  if (top < MARGIN) top = MARGIN;

  return { left: Math.round(left), top: Math.round(top) };
}

/**
 * `RenderItemInfo` + `RenderTipTextList`: the black 80% box with the
 * coloured text lines, centred on the cursor's x and hanging below it, kept
 * inside the viewport. Portalled onto the body so no window clips it.
 *
 * `x` / `y` are only the *initial* cursor position: once mounted the box
 * follows the pointer itself through a `transform`, so the grid that owns
 * it re-renders when the hovered item changes, not per pointer move. The
 * text (`buildItemTooltip`, ~40 lines of stat maths) is memoised on the
 * item's fields and the hero's stats.
 */
export const ItemTooltip = observer(
  ({
    item,
    x,
    y,
    context = 'inventory',
    price,
    slot,
  }: {
    item: Item;
    x: number;
    y: number;
    context?: TooltipContext;
    price?: number;
    /** Inventory slot the item sits in (pets ask the server by slot). */
    slot?: number;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const size = useRef({ width: 0, height: 0 });
    const cursor = useRef({ x, y });

    // Every field an item can change is part of the stamp, so a +1 or a
    // durability tick rebuilds and anything else reuses the lines.
    const hero = heroStats();
    const itemStamp = JSON.stringify(item);
    const heroStamp = JSON.stringify(hero);
    const data = useMemo(
      () => buildItemTooltip(item, hero),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [itemStamp, heroStamp]
    );

    const pet = context === 'inventory' ? petTypeOf(item) : undefined;
    const petSlot =
      pet === undefined ? -1 : slot ?? Store.playerData.items.indexOf(item);

    // ZzzInventory.cpp:2116: hovering a Dark Horse / Raven asks the server for its stats.
    useEffect(() => {
      if (pet === undefined || petSlot < 0) return;
      const now = performance.now();
      if (now - (lastPetInfoRequest.get(petSlot) ?? -Infinity) < PET_INFO_REQUEST_INTERVAL_MS) return;
      lastPetInfoRequest.set(petSlot, now);
      Store.requestPetInfo(pet, petSlot);
    }, [pet, petSlot]);

    const lines = useMemo(() => {
      if (!data) return null;
      const [name, ...rest] = data.lines;
      const all = name
        ? [name, ...priceLines(item, context, name.color, price), ...rest]
        : [...data.lines];
      if (pet !== undefined && petSlot >= 0) all.push(...petLines(pet, petSlot));
      return all;
      // Tracked observables (shop, repair mode, pet info) re-run the observer,
      // and the stamps cover the item itself.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, context, price, pet, petSlot, Store.npcShop, Store.repairMode, Store.petInfo]);

    const move = (clientX: number, clientY: number) => {
      cursor.current = { x: clientX, y: clientY };
      const box = ref.current;
      if (!box) return;
      const { left, top } = place(
        clientX,
        clientY,
        size.current.width,
        size.current.height
      );
      box.style.transform = `translate(${left}px, ${top}px)`;
    };

    // Measure once per content change (the one layout read), then place.
    useLayoutEffect(() => {
      const box = ref.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      size.current = { width: rect.width, height: rect.height };
      move(cursor.current.x, cursor.current.y);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lines]);

    // The initial position from the props, then the pointer itself.
    useLayoutEffect(() => {
      move(x, y);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [x, y]);

    useEffect(() => {
      let frame = 0;
      let pending: { x: number; y: number } | null = null;
      const onMove = (event: PointerEvent) => {
        pending = { x: event.clientX, y: event.clientY };
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (pending) move(pending.x, pending.y);
        });
      };
      window.addEventListener('pointermove', onMove);
      return () => {
        window.removeEventListener('pointermove', onMove);
        if (frame) cancelAnimationFrame(frame);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!lines) return null;

    return createPortal(
      <div ref={ref} className="mu-item-tooltip">
        {lines.map((line, index) =>
          line.blank ? (
            <div key={index} className="mu-item-tooltip-gap" />
          ) : (
            <div
              key={index}
              className={`mu-item-tooltip-line color-${line.color}${
                line.bold ? ' bold' : ''
              }`}
            >
              {line.text}
            </div>
          )
        )}
      </div>,
      document.body
    );
  }
);
