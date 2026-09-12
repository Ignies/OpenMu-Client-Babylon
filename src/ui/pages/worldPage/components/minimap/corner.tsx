import './style.less';
import { useLayoutEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { GameOptions, uiScaleFactor } from '../../../../../common/gameOptions';
import type { MinimapMarker } from '../../../../../common/minimapData';
import { MuTipText } from '../../../../components/muText';
import {
  CenterButton,
  Frame,
  HERO_SIZE,
  HERO_SPRITE,
  isPanned,
  MAP_ROTATION,
  MARKER_SIZE,
  MARKER_SPRITE,
  NO_PAN,
  NPC_SIZE,
  NPC_SPRITE,
  Sprite,
  TERRAIN_SIZE,
  useMapDrag,
  usePartyMarkers,
  useWorldMinimap,
  type MapPan,
} from './shared';

/**
 * The corner minimap: ours. The original's one map is the TAB sheet
 * (`CNewUIMiniMap`, `sheet.tsx`); later clients keep a small copy of it in
 * the top right corner of the play area, and this is that - the same
 * `mini_map.ozt`, the same 45° spin about the hero, the same marker files,
 * drawn small and left on screen. TAB still opens the sheet, over it;
 * the panel steps aside while the sheet is up.
 *
 * Laid out in the sheet's art units (its 35 px corners, 15 / 30 px markers)
 * and scaled as one element, so the frame and the markers keep the sheet's
 * proportions at any interface size. The bar under it (the coordinates, and
 * the Center button while the map is dragged off the hero) is scaled back
 * up to the interface size, so its text and plate match every other button.
 *
 * The hero moves every frame and nothing here re-renders for it: the
 * markers and the hero are children of the map picture at their own tile,
 * and one frame loop slides the picture under the fixed centre and writes
 * the hero's place and the coordinates.
 */

const PANEL = 240;
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
  // Under the sheet it would only be a dimmed ghost of the same map.
  const shown = !!world && !Store.minimapEnabled;
  // `mapIndex` is a plain field: the frame loop below carries a warp over.
  const [map, setMap] = useState<number | undefined>(undefined);
  const minimap = useWorldMinimap(shown ? map : undefined);
  const partyMarkers = usePartyMarkers(shown, map);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState<MapPan>(NO_PAN);
  const pictureRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);
  const scale = PANEL_SCALE * uiScaleFactor(GameOptions.uiScale);
  const mapSize = ZOOM_LEVELS[zoom];
  const { dragging, handlers } = useMapDrag(mapSize, scale, setPan);

  // Before paint, so the picture never shows its top-left corner for a frame.
  useLayoutEffect(() => {
    if (!shown) return;

    let frame = 0;
    let lastMap = map;
    let lastX = NaN;
    let lastY = NaN;

    const tick = () => {
      frame = requestAnimationFrame(tick);

      const current = Store.world;
      if (!current) return;
      if (current.mapIndex !== lastMap) {
        lastMap = current.mapIndex;
        setMap(lastMap);
        // A warp: back on the hero.
        setPan(NO_PAN);
      }

      const pos = current.playerEntity?.transform?.pos;
      const picture = pictureRef.current;
      if (!pos || !picture || (pos.x === lastX && pos.z === lastY)) return;
      lastX = pos.x;
      lastY = pos.z;

      const heroTx = (pos.z / TERRAIN_SIZE) * mapSize;
      const heroTy = (pos.x / TERRAIN_SIZE) * mapSize;
      const tx = heroTx + (pan.u / TERRAIN_SIZE) * mapSize;
      const ty = heroTy + (pan.v / TERRAIN_SIZE) * mapSize;
      picture.style.transform = `translate(${-tx}px, ${-ty}px)`;
      const hero = heroRef.current;
      if (hero) {
        hero.style.left = `${heroTx - HERO_SIZE / 2}px`;
        hero.style.top = `${heroTy - HERO_SIZE / 2}px`;
      }
      if (coordsRef.current) {
        coordsRef.current.textContent = `${Math.floor(pos.x)}, ${Math.floor(pos.z)}`;
      }
    };

    tick();
    return () => cancelAnimationFrame(frame);
  }, [shown, map, mapSize, minimap, pan]);

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
      <div className={`minimap-corner-clip${dragging ? ' is-dragging' : ''}`} {...handlers}>
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
            <div
              ref={heroRef}
              className="minimap-corner-hero"
              style={{
                width: HERO_SIZE,
                height: HERO_SIZE,
                transform: `rotate(${-MAP_ROTATION}deg)`,
              }}
            >
              <Sprite file={HERO_SPRITE} size={HERO_SIZE} />
            </div>
          </div>
        </div>
      </div>
      <Frame width={PANEL} height={PANEL} />
      <div className="minimap-corner-bar" style={{ transform: `scale(${1 / PANEL_SCALE})` }}>
        {isPanned(pan) && <CenterButton onClick={() => setPan(NO_PAN)} />}
        <div ref={coordsRef} className="minimap-corner-coords" />
      </div>
    </div>
  );
});
