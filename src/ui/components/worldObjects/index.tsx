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
import type { Entity } from '../../../ecs/world';
import { stableKeyOf } from '../partyBars/stableKey';

const isAlt = (code: string) => code === 'AltLeft' || code === 'AltRight';

/**
 * CNewUINameWindow (NewUINameWindow.cpp:74, :201): pressing ALT toggles the
 * names over every drop on the ground, and they also show for as long as ALT
 * is held. Returns whether the overlay is on right now.
 */
function useDropNamesOverlay(): boolean {
  const [held, setHeld] = useState(false);

  useEventBus('keyPressed', code => {
    if (!isAlt(code)) return;
    setHeld(true);
    Store.toggleDropNames();
  });
  useEventBus('keyReleased', code => {
    if (isAlt(code)) setHeld(false);
  });

  return Store.showDropNames || held;
}

type DropEntity = With<Entity, 'transform' | 'screenPosition' | 'droppedItem'>;

/**
 * A drop's name: drawn over the item while the ALT overlay is on or the
 * cursor is on the item (SelectedItem), and clickable — the original's
 * ALT-mode `SelectItem()` lets players pull one item out of a loot pile.
 */
const DropLabel = ({
  entity,
  overlay,
}: {
  entity: DropEntity;
  overlay: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  const hoveredRef = useRef(false);

  // `currentPointerTarget` is plain state sampled per frame; piggyback on the
  // per-frame screen-position event instead of polling.
  useEffect(
    () =>
      onScreenPosition(entity, () => {
        const now = Store.world?.currentPointerTarget === entity;
        if (now !== hoveredRef.current) {
          hoveredRef.current = now;
          setHovered(now);
        }
      }),
    [entity]
  );

  if (!overlay && !hovered) return null;

  return (
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
    />
  );
};

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

  const dropOverlay = useDropNamesOverlay();

  return (
    <div className="world-objects">
      {query.entities.map(entity => (
        <DropLabel
          key={stableKeyOf(entity)}
          entity={entity as DropEntity}
          overlay={dropOverlay}
        />
      ))}
      <NameTags />
      <PartyBars />
      <EmojiBubbles />
    </div>
  );
});
