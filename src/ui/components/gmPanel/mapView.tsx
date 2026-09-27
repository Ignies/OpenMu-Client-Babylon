import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../i18n';
import type { TrackedPlayer } from '../../../common/adminProtocol';
import type { ENUM_WORLD } from '../../../common/types';
import { loadWorldMinimap, type WorldMinimap } from '../../../libs/mu/minimap';
import type { Nearby } from '../../../gmWorld';

/**
 * One world's minimap picture with every tracked player on it.
 *
 * The picture is the world's `mini_map.ozt`, drawn flat (the original spins
 * it 45 degrees about the hero; this is an instrument, not scenery). Its
 * horizontal axis runs along tile Y and its vertical axis along tile X, the
 * way the sheet places its markers (`minimap/sheet.tsx`), so a dot for tile
 * (x, y) sits at left = y / 256, top = x / 256.
 *
 * Dots are ordinary elements with a transition, so a walking player slides
 * between the tracker's updates instead of jumping.
 */

const TERRAIN_SIZE = 256;

export type MapViewProps = {
  map: number;
  players: readonly TrackedPlayer[];
  /** The game master's own tile on this map, if standing on it. */
  hero: { x: number; y: number } | null;
  /** What the client itself has in scope on this map. */
  scope: readonly Nearby[];
  selectedId: string | null;
  onPick: (player: TrackedPlayer) => void;
  /** A Shift+click on tile (x, y): a plain click is too easy to make by accident to act on. */
  onTile?: (x: number, y: number) => void;
  /** A right-click on tile (x, y), at that point on screen. */
  onMenu?: (x: number, y: number, clientX: number, clientY: number) => void;
  /** A right-click on a player's dot. */
  onPlayerMenu?: (player: TrackedPlayer, clientX: number, clientY: number) => void;
};

/** The tile under a point on the picture: its across runs along Y, its down along X. */
function tileAt(box: DOMRect, clientX: number, clientY: number): [number, number] {
  const y = Math.floor(((clientX - box.left) / box.width) * TERRAIN_SIZE);
  const x = Math.floor(((clientY - box.top) / box.height) * TERRAIN_SIZE);
  return [Math.max(0, Math.min(255, x)), Math.max(0, Math.min(255, y))];
}

function percent(tile: number): string {
  return `${(Math.min(TERRAIN_SIZE, Math.max(0, tile)) / TERRAIN_SIZE) * 100}%`;
}

export const MapView = observer(function MapView({
  map,
  players,
  hero,
  scope,
  selectedId,
  onPick,
  onTile,
  onMenu,
  onPlayerMenu,
}: MapViewProps) {
  const [picture, setPicture] = useState<WorldMinimap | null | undefined>(undefined);
  // The tile under the cursor, read out in the corner while it is over the map.
  const [hover, setHover] = useState<[number, number] | null>(null);

  useEffect(() => {
    let alive = true;
    setPicture(undefined);
    loadWorldMinimap(map as ENUM_WORLD)
      .then(loaded => {
        if (alive) setPicture(loaded);
      })
      .catch(() => {
        if (alive) setPicture(null);
      });
    return () => {
      alive = false;
    };
  }, [map]);

  return (
    <div
      className={`gm-map${picture ? '' : ' is-blank'}`}
      style={picture ? { backgroundImage: `url(${picture.image.url})` } : undefined}
      onClick={event => {
        if (!onTile || !event.shiftKey) return;
        const [x, y] = tileAt(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
        onTile(x, y);
      }}
      onContextMenu={event => {
        if (!onMenu) return;
        event.preventDefault();
        const [x, y] = tileAt(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
        onMenu(x, y, event.clientX, event.clientY);
      }}
      onMouseMove={event =>
        setHover(tileAt(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY))
      }
      onMouseLeave={() => setHover(null)}
    >
      {hover ? (
        <span className="gm-map-readout gm-mono">
          {hover[0]}, {hover[1]}
        </span>
      ) : null}
      {picture === null ? <span className="gm-map-note">{t('gm.map.noPicture')}</span> : null}

      {scope.map(entry => (
        <span
          key={`s${entry.netId}`}
          className={`gm-map-scope gm-map-scope-${entry.kind}`}
          style={{ left: percent(entry.y), top: percent(entry.x) }}
          title={`${entry.name} (${entry.x}, ${entry.y})`}
        />
      ))}

      {players.map(player => (
        <button
          key={player.id}
          type="button"
          className={`gm-map-dot${player.gm ? ' is-gm' : ''}${player.id === selectedId ? ' is-selected' : ''}`}
          style={{ left: percent(player.y), top: percent(player.x) }}
          title={`${player.character ?? player.account ?? player.id} (${player.x}, ${player.y})`}
          onClick={event => {
            event.stopPropagation();
            onPick(player);
          }}
          onContextMenu={event => {
            if (!onPlayerMenu) return;
            event.preventDefault();
            event.stopPropagation();
            onPlayerMenu(player, event.clientX, event.clientY);
          }}
        >
          <span className="gm-map-label">{player.character ?? player.account}</span>
        </button>
      ))}

      {hero ? (
        <span
          className="gm-map-hero"
          style={{ left: percent(hero.y), top: percent(hero.x) }}
          title={`${t('gm.map.you')} (${hero.x}, ${hero.y})`}
        />
      ) : null}
    </div>
  );
});
