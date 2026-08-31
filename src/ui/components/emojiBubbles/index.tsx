import './style.less';
import { useEffect, useMemo, useRef } from 'react';
import type { With } from 'miniplex';
import { Store } from '../../../store';
import { useRenderId } from '../../../hooks';
import { onScreenPosition } from '../../../libs/screenPositionBus';
import {
  BUBBLE_FADE_SECONDS,
  emojiBubbleById,
} from '../../../common/emojiBubbles';
import type { Entity } from '../../../ecs/world';

type BubbleEntity = With<Entity, 'emojiBubble' | 'screenPosition'>;

const OFF_SCREEN = 'translate(-10000px, -10000px)';

/**
 * A character's emoji bubble (`common/emojiBubbles.ts`).
 *
 * Both placements ride their own projected world anchor — over the head, or
 * on the shoulder `EmojiBubbleSystem` picks as the one facing the camera.
 * Position and fade are driven straight from the
 * per-frame screen-position callback — no React re-render per frame, only a
 * transform write, the same way the name tags and guild marks work.
 */
const EmojiBubble = ({ entity }: { entity: BubbleEntity }) => {
  const ref = useRef<HTMLDivElement>(null);

  const bubble = entity.emojiBubble;
  const def = emojiBubbleById(bubble.id);
  const isSide = def.placement === 'side';

  useEffect(() => {
    const element = ref.current;
    if (element) element.style.transform = OFF_SCREEN;

    return onScreenPosition(entity, () => {
      const el = ref.current;
      if (!el) return;

      const current = entity.emojiBubble;
      if (!current) return;

      // Both placements ride their own projected world anchor, so the bubble
      // keeps its distance from the body as the camera zooms.
      if (!current.onScreen) {
        el.style.transform = OFF_SCREEN;
        return;
      }

      el.style.transform = `translate(${Math.round(
        current.screenX
      )}px, ${Math.round(current.screenY)}px)`;

      // Fade over the tail of the lifetime; the pop-in is a CSS animation.
      el.style.opacity =
        current.life < BUBBLE_FADE_SECONDS
          ? Math.max(0, current.life / BUBBLE_FADE_SECONDS).toFixed(2)
          : '1';
    });
  }, [entity, isSide]);

  return (
    <div ref={ref} className={`emoji-bubble ${isSide ? 'side' : 'head'}`}>
      <span className="glyph">{def.glyph}</span>
    </div>
  );
};

const entityIds = new WeakMap<object, number>();
let nextEntityId = 1;

function keyOf(entity: Entity): number {
  let id = entityIds.get(entity);
  if (id === undefined) {
    id = nextEntityId++;
    entityIds.set(entity, id);
  }
  return id;
}

export const EmojiBubbles = () => {
  const world = Store.world!;
  const { refresh } = useRenderId();

  const query = useMemo(
    () => world.with('emojiBubble', 'screenPosition'),
    [world]
  );

  useEffect(() => {
    const added = query.onEntityAdded.subscribe(refresh);
    const removed = query.onEntityRemoved.subscribe(refresh);
    return () => {
      added();
      removed();
    };
  }, [query]);

  return (
    <div className="emoji-bubbles">
      {query.entities.map(entity => (
        // The serial in the key remounts on a re-trigger, which is what
        // replays the pop-in animation and swaps the glyph.
        <EmojiBubble
          key={`${keyOf(entity)}_${entity.emojiBubble.serial}`}
          entity={entity as BubbleEntity}
        />
      ))}
    </div>
  );
};
