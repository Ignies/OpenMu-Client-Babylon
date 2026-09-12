import './style.less';
import { useLayoutEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { GameOptions, uiScaleFactor } from '../../../../../common/gameOptions';
import type { MinimapMarker } from '../../../../../common/minimapData';
import { MuTipText } from '../../../../components/muText';
import {
  Frame,
  HERO_SIZE,
  HERO_SPRITE,
  MAP_ROTATION,
  MARKER_SIZE,
  MARKER_SPRITE,
  NPC_SIZE,
  NPC_SPRITE,
  Sprite,
  TERRAIN_SIZE,
  usePartyMarkers,
  useWorldMinimap,
} from './shared';

/**
 * The corner minimap: ours. The original's one map is the TAB sheet
 * (`CNewUIMiniMap`, `sheet.tsx`); later clients keep a small copy of it in
 * the top right corner of the play area, and this is that - the same
 * `mini_map.ozt`, the same 45° spin about the hero, the same marker files,
 * drawn small and left on screen. TAB shows and hides it
 * (`Store.minimapCornerHidden`).
 *
 * Laid out in the sheet's art units (its 35 px corners, 15 / 30 px markers)
 * and scaled as one element, so the frame and the markers keep the sheet's
 * proportions at any interface size.
 *
 * The hero moves every frame and nothing here re-renders for it: the
 * markers are children of the map picture at their own tile, and one frame
 * loop slides the picture under the fixed centre and writes the coordinates.
 */

const PANEL = 240;
const CENTER = PANEL / 2;
/** Art units to CSS pixels at interface size 100%. */
const PANEL_SCALE = 0.75;

/** Map edge length per zoom step, in art units; the sheet draws 800. */
const ZOOM_LEVELS = [512, 640, 768, 1024, 1280];
const DEFAULT_ZOOM = 2;

const MapMarker = ({ marker, mapSize }: { marker: MinimapMarker; mapSize: number }) => {
  const [hovered, setHovered] = useState(false);
  const size = MARKER_SIZE[marker.kind] ?? NPC_SIZE;

  // Its tile on the picture: U along tile Y, V along tile X, as the sheet.
  // Upright again inside the spun picture; the sprite then turns by its own
  // yaw, which leaves the tip box upright too.
  return (
    <div
      className="minimap-corner-marker"
      style={{
        left: (marker.y / TERRAIN_SIZE) * mapSize - size / 2,
        top: (marker.x / TERRAIN_SIZE) * mapSize - size / 2,
        width: size,
        height: size,
        transform: `rotate(${-MAP_ROTATION}deg)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Sprite
        file={MARKER_SPRITE[marker.kind] ?? NPC_SPRITE}
        size={size}
        style={{ transform: `rotate(${marker.rotation}deg)` }}
      />
      {hovered && (
        <MuTipText
          text={marker.name}
          background="rgba(0,0,0,0.7)"
          className="minimap-corner-tip"
        />
      )}
    </div>
  );
};

export const MinimapCorner = observer(() => {
  const world = Store.world;
  const shown = !!world && !Store.minimapCornerHidden;
  // `mapIndex` is a plain field: the frame loop below carries a warp over.
  const [map, setMap] = useState<number | undefined>(undefined);
  const minimap = useWorldMinimap(shown ? map : undefined);
  const partyMarkers = usePartyMarkers(shown, map);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const pictureRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const scale = PANEL_SCALE * uiScaleFactor(GameOptions.uiScale);
  const mapSize = ZOOM_LEVELS[zoom];

  // Before paint, so the picture never shows its top-left corner for a frame.
  useLayoutEffect(() => {
    if (!shown) return;

    let frame = 0;
    let lastMap = -1;
    let lastX = NaN;
    let lastY = NaN;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const current = Store.world;
      if (!current) return;
      if (current.mapIndex !== lastMap) {
        lastMap = current.mapIndex;
        setMap(lastMap);
      }

      const pos = current.playerEntity?.transform?.pos;
      const picture = pictureRef.current;
      if (!pos || !picture || (pos.x === lastX && pos.z === lastY)) return;
      lastX = pos.x;
      lastY = pos.z;

      const tx = (pos.z / TERRAIN_SIZE) * mapSize;
      const ty = (pos.x / TERRAIN_SIZE) * mapSize;
      picture.style.transform = `translate(${-tx}px, ${-ty}px)`;
      if (coordsRef.current) {
        coordsRef.current.textContent = `${Math.floor(pos.x)}, ${Math.floor(pos.z)}`;
      }
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [shown, mapSize, minimap]);

  if (!shown || !minimap) return null;

  const onWheel = (event: React.WheelEvent) => {
    setZoom(z =>
      Math.max(0, Math.min(ZOOM_LEVELS.length - 1, z + (event.deltaY < 0 ? 1 : -1)))
    );
  };

  return (
    <div
      className="minimap-corner-panel"
      style={{ width: PANEL, height: PANEL, transform: `scale(${scale})` }}
      onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="minimap-corner-clip">
        <div
          className="minimap-corner-spin"
          style={{ transform: `rotate(${MAP_ROTATION}deg)` }}
        >
          <div
            ref={pictureRef}
            className="minimap-corner-map"
            style={{
              width: mapSize,
              height: mapSize,
              backgroundImage: `url(${minimap.image.url})`,
            }}
          >
            {minimap.markers.map((marker, i) => (
              <MapMarker key={i} marker={marker} mapSize={mapSize} />
            ))}
            {partyMarkers.map((marker, i) => (
              <MapMarker key={`party-${i}`} marker={marker} mapSize={mapSize} />
            ))}
          </div>
        </div>
        <Sprite
          file={HERO_SPRITE}
          size={HERO_SIZE}
          style={{
            position: 'absolute',
            left: CENTER - HERO_SIZE / 2,
            top: CENTER - HERO_SIZE / 2,
          }}
        />
      </div>
      <Frame width={PANEL} height={PANEL} />
      <div ref={coordsRef} className="minimap-corner-coords" />
    </div>
  );
});
