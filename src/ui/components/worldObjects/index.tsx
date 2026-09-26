import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { With } from 'miniplex';
import { WorldLabel } from '../worldLabel';
import { NameTags } from '../nameTags';
import { PartyBars } from '../partyBars';
import { EmojiBubbles } from '../emojiBubbles';
import { useRenderId } from '../../../hooks';
import { useEventBus } from '../../../hooks/useEventBus';
import { onScreenPosition } from '../../../libs/screenPositionBus';
import { DROP_TIER_COLOURS, dropTier } from '../../../common/dropTier';
import { dropPassesLootFilter } from '../../../common/lootFilter';
import { GameOptions } from '../../../common/gameOptions';
import { ItemTooltip } from '../itemTooltip';
import type { Entity } from '../../../ecs/world';
import { stableKeyOf } from '../partyBars/stableKey';

const isAlt = (code: string) => code === 'AltLeft' || code === 'AltRight';

/** How long the cursor has to rest on a drop before its tooltip opens. */
const DROP_TOOLTIP_DELAY_MS = 250;

/**
 * CNewUINameWindow (NewUINameWindow.cpp:74, :201): pressing ALT toggles the
 * names over every drop on the ground, and they also show for as long as ALT
 * is held. Returns whether the overlay is on right now.
 */
function useDropNamesOverlay(): { overlay: boolean; showAll: boolean } {
  const [held, setHeld] = useState(false);

  useEventBus('keyPressed', code => {
    if (!isAlt(code)) return;
    setHeld(true);
    Store.toggleDropNames();
  });
  useEventBus('keyReleased', code => {
    if (isAlt(code)) setHeld(false);
  });

  // Held ALT is the escape hatch: it names every drop, filter or not.
  return { overlay: Store.showDropNames || held, showAll: held };
}

type DropEntity = With<Entity, 'transform' | 'screenPosition' | 'droppedItem'>;

type Point = { x: number; y: number };

/**
 * Where the box opens. `ItemTooltip` keeps itself clear of the cursor art and
 * then follows the pointer, so it is handed the cursor.
 *
 * On the label, that is where the pointer came in: the scene stops hearing
 * moves the moment the cursor leaves the canvas, so its own reading is stale
 * there. Otherwise the scene's reading is the one the pick itself used, and
 * the canvas fills the window, so those coordinates are the viewport's.
 */
function tooltipAnchor(entity: DropEntity, onLabel: Point | null): Point {
  if (onLabel) return onLabel;

  const scene = Store.world?.scene;

  if (scene && (scene.pointerX !== 0 || scene.pointerY !== 0)) {
    return { x: scene.pointerX, y: scene.pointerY };
  }

  return { x: entity.screenPosition.x, y: entity.screenPosition.y };
}

/**
 * A drop's name: drawn over the item while the ALT overlay is on or the
 * cursor is on the item (SelectedItem), and clickable - the original's
 * ALT-mode `SelectItem()` lets players pull one item out of a loot pile.
 */
const DropLabel = observer(({
  entity,
  overlay,
  showAll,
}: {
  entity: DropEntity;
  overlay: boolean;
  showAll: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);
  const [onLabel, setOnLabel] = useState(false);
  const labelPointer = useRef<Point | null>(null);
  const [anchor, setAnchor] = useState<Point | null>(null);

  // `currentPointerTarget` is plain state sampled per frame; piggyback on the
  // per-frame screen-position event instead of polling. A drop going off
  // screen gets one last (0, 0) event and then none, so that one unhovers it.
  useEffect(
    () =>
      onScreenPosition(entity, pos => {
        const onScreen = pos.x * pos.x + pos.y * pos.y >= 0.1;
        const now = onScreen && Store.world?.currentPointerTarget === entity;
        if (now !== hoveredRef.current) {
          hoveredRef.current = now;
          setHovered(now);
        }
      }),
    [entity]
  );

  const named = overlay && (showAll || dropPassesLootFilter(entity.droppedItem));
  const visible = named || hovered;

  // Money is its own name ("Zen 1234") and a drop whose bytes did not decode
  // has nothing to show, so both keep the label alone.
  const item = entity.droppedItem.isMoney ? undefined : entity.droppedItem.item;
  const wanted = GameOptions.dropTooltips && !!item && visible && (hovered || onLabel);

  useEffect(() => {
    if (!wanted) {
      setAnchor(null);
      return;
    }
    const timer = setTimeout(
      () => setAnchor(tooltipAnchor(entity, labelPointer.current)),
      DROP_TOOLTIP_DELAY_MS
    );

    return () => clearTimeout(timer);
  }, [wanted, entity]);

  // A latch turned off under a resting cursor takes the label away without a
  // leave event, so the flag is cleared with the element it belongs to.
  useEffect(() => {
    if (!visible) {
      labelPointer.current = null;
      setOnLabel(false);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <WorldLabel
        entity={entity}
        text={entity.objectNameInWorld ?? ''}
        colour={DROP_TIER_COLOURS[dropTier(entity.droppedItem)]}
        className="drop"
        onPointerDown={ev => {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          const world = Store.world;
          if (!world || Store.pickedItem || Store.pendingItemMove) return;
          world.pickupTarget = entity;
        }}
        onPointerEnter={ev => {
          labelPointer.current = { x: ev.clientX, y: ev.clientY };
          setOnLabel(true);
        }}
        onPointerLeave={() => {
          labelPointer.current = null;
          setOnLabel(false);
        }}
      />
      {anchor && item && (
        <ItemTooltip item={item} x={anchor.x} y={anchor.y} context="plain" />
      )}
    </>
  );
});

/**
 * Drop names here; character and NPC names are the original's hover/chat
 * balloons (`RenderBooleans`), owned by NameTagSystem and drawn by NameTags -
 * the original never draws a character's name permanently.
 */
export const WorldObjects = observer(() => {
  const world = Store.world!;

  const { refresh } = useRenderId();

  const query = useMemo(
    () => world.with('transform', 'screenPosition', 'droppedItem'),
    [world]
  );

  useEffect(() => {
    const sub = query.onEntityAdded.subscribe(refresh);
    const sub2 = query.onEntityRemoved.subscribe(refresh);

    return () => {
      sub();
      sub2();
    };
  }, [query]);

  const { overlay: dropOverlay, showAll: dropShowAll } = useDropNamesOverlay();

  return (
    <div className="world-objects">
      {query.entities.map(entity => (
        <DropLabel
          key={stableKeyOf(entity)}
          entity={entity as DropEntity}
          overlay={dropOverlay}
          showAll={dropShowAll}
        />
      ))}
      <NameTags />
      <PartyBars />
      <EmojiBubbles />
    </div>
  );
});
