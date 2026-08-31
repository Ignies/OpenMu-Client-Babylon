import './style.less';
import { useEffect, useMemo, useRef } from 'react';
import type { With } from 'miniplex';
import { Store } from '../../../store';
import { useRenderId } from '../../../hooks';
import { onScreenPosition } from '../../../libs/screenPositionBus';
import type { Entity } from '../../../ecs/world';
import { guildMarkDataUrl, isEmptyGuildMark } from '../../../common/guildMark';

type MarkEntity = With<Entity, 'guild' | 'screenPosition'>;

const MARK_PX = 16;
/** `RenderGuildMark`: the mark floats a little above the name balloon anchor. */
const MARK_OFFSET_Y = 22;

/**
 * The guild mark the original draws over every guild member's head
 * (`RenderGuildMark` in ZzzInterface.cpp). Positions come from the same
 * `entityScreenPositionUpdated` stream the name tags use; the image is the
 * 8x8 GuildInformation logo scaled with nearest-neighbour.
 */
const GuildMark = ({ entity }: { entity: MarkEntity }) => {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handler = (screenPosition: { x: number; y: number }) => {
      const el = ref.current;
      if (!el) return;
      const visible =
        screenPosition.x * screenPosition.x + screenPosition.y * screenPosition.y >= 0.1;
      el.style.transform = visible
        ? `translate(${Math.floor(screenPosition.x - MARK_PX / 2)}px, ${Math.floor(
            screenPosition.y - MARK_OFFSET_Y - MARK_PX
          )}px)`
        : 'translate(-10000px, -10000px)';
    };
    return onScreenPosition(entity, handler);
  }, [entity]);

  const guild = Store.guilds.get(entity.guild.id);
  if (!guild || !guild.logo.length || isEmptyGuildMark(guild.logo)) return null;

  return (
    <img
      ref={ref}
      className="guild-mark-tag"
      width={MARK_PX}
      height={MARK_PX}
      alt=""
      title={guild.name}
      src={guildMarkDataUrl(guild.logo)}
    />
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

export const GuildMarks = () => {
  const world = Store.world!;
  const { refresh } = useRenderId();
  const query = useMemo(() => world.with('guild', 'screenPosition'), [world]);

  useEffect(() => {
    const a = query.onEntityAdded.subscribe(refresh);
    const b = query.onEntityRemoved.subscribe(refresh);
    // GuildInformation can arrive after the member did; re-check every so
    // often so a mark that had no logo yet shows up.
    const id = window.setInterval(refresh, 2000);
    return () => {
      a();
      b();
      window.clearInterval(id);
    };
  }, [query]);

  return (
    <div className="guild-marks">
      {query.entities.map(entity => (
        <GuildMark key={keyOf(entity)} entity={entity as MarkEntity} />
      ))}
    </div>
  );
};
