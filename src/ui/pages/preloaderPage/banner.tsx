import { useState, type CSSProperties } from 'react';
import type { TextKey } from '../../../i18n';
import type { ServerProfile } from '../../../common/serverConfig';
import type { Reach } from '../../../common/serverProbe';

/** What the status dot means, as its tooltip. `unknown` draws no dot. */
export const REACH_TEXT: Record<Exclude<Reach, 'unknown'>, TextKey> = {
  checking: 'worlds.checking',
  up: 'worlds.answering',
  down: 'worlds.noAnswer',
};

/** A stable number per world, so each unbannered card gets its own corner of the map. */
function hashOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The world's published banner, or - with none, or one that fails to load from
 * somebody else's host - a piece of the world map in the page's red.
 */
export const Banner = ({ world }: { world: ServerProfile }) => {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!world.image || broken) {
    const h = hashOf(world.id);

    return (
      <span
        className="ws-banner ws-banner-map"
        style={{ '--map-at': `${h % 101}% ${(h >>> 8) % 101}%` } as CSSProperties}
      />
    );
  }

  return (
    <img
      className={`ws-banner${loaded ? ' is-in' : ''}`}
      src={world.image}
      alt=""
      // A cached banner can finish before React attaches `onLoad`.
      ref={img => {
        if (img?.complete && img.naturalWidth) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setBroken(true)}
    />
  );
};
