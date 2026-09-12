import { t } from '../../../../../i18n';
import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { uiClick } from '../../../../../libs/sfx';
import type { MinimapMarker } from '../../../../../common/minimapData';
import { useMuSprite } from '../../../../components/muSprite';
import { MuTipText } from '../../../../components/muText';
import { useUiStageScale } from '../../../../components/uiStage';
import {
  CLOSE_SPRITE,
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
  useHeroTile,
  usePartyMarkers,
  useWorldMinimap,
  type MapPoint,
} from './shared';

/**
 * `CNewUIMiniMap` (NewUIMiniMap.cpp): TAB drops a near-black sheet over the
 * play area and draws the world's `mini_map.ozt` rotated 45° so that the
 * hero sits at the centre, with the NPC and portal markers from the
 * localised `Minimap_World{n}.bmd` riding on it. Hovering a marker shows its
 * name in a tip box, the X at the top right (or TAB / ESC) closes it, and
 * while it is open every other hot key is swallowed (`NewUIHotKey.cpp:131`).
 *
 * Geometry, in the original's 640×480 UI space: the sheet is 640×430 (the
 * main frame stays visible under it), the map is `m_Lenth[m_MiniPos]` px on
 * a side (800 at the only zoom level the original ever uses; the other five
 * entries are here as the mouse-wheel zoom, which is ours) and the hero's
 * tile is pinned to the screen centre — texture U runs along tile Y and V
 * along tile X (`Tx = PositionY / 256 · L`, `Ty = PositionX / 256 · L`).
 * Markers are 15 px (NPC) / 30 px (portal) sprites placed at their tile the
 * same way and spun by their own `Rotation` on top of the map's 45°.
 * `RenderPointRotate` nudges every marker 25 px right and the hero sprite is
 * drawn at (325, 230) rather than (320, 240); both read as fudge against
 * `ConvertX`, so here everything shares the exact centre.
 *
 * The TAB and Escape keys are handled by `Minimap` (`index.tsx`), which
 * also owns the choice between this sheet and the corner panel.
 */

const SHEET_WIDTH = 640;
const SHEET_HEIGHT = 430;
const SHEET_ALPHA = 0.85;
const CENTER_X = 320;
const CENTER_Y = 240;

/** `m_Lenth[]`: map edge length per zoom step. */
const ZOOM_LEVELS = [800, 1000, 1200, 1400, 1600, 1800];

const CLOSE_BUTTON = { x: 640 - 27, y: 3, width: 30, height: 25 };
const CLOSE_FRAME = { width: 36, height: 29 };

const Marker = ({
  marker,
  hero,
  mapSize,
  onHover,
}: {
  marker: MinimapMarker;
  hero: MapPoint;
  mapSize: number;
  onHover: (marker: MinimapMarker | null) => void;
}) => {
  const size = MARKER_SIZE[marker.kind] ?? NPC_SIZE;
  // Offset from the hero in map pixels, before the 45° spin.
  const dx = ((marker.y - hero.y) / TERRAIN_SIZE) * mapSize;
  const dy = ((marker.x - hero.x) / TERRAIN_SIZE) * mapSize;

  return (
    <Sprite
      file={MARKER_SPRITE[marker.kind] ?? NPC_SPRITE}
      size={size}
      style={{
        position: 'absolute',
        left: CENTER_X - size / 2,
        top: CENTER_Y - size / 2,
        transform: `rotate(${MAP_ROTATION}deg) translate(${dx}px, ${dy}px) rotate(${marker.rotation - MAP_ROTATION}deg)`,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="minimap-marker-hit"
        onMouseEnter={() => onHover(marker)}
        onMouseLeave={() => onHover(null)}
      />
    </Sprite>
  );
};

const MarkerTip = ({
  marker,
  hero,
  mapSize,
}: {
  marker: MinimapMarker;
  hero: MapPoint;
  mapSize: number;
}) => {
  const size = MARKER_SIZE[marker.kind] ?? NPC_SIZE;
  const dx = ((marker.y - hero.y) / TERRAIN_SIZE) * mapSize;
  const dy = ((marker.x - hero.x) / TERRAIN_SIZE) * mapSize;
  const rad = (MAP_ROTATION * Math.PI) / 180;
  const sx = CENTER_X + dx * Math.cos(rad) - dy * Math.sin(rad);
  const sy = CENTER_Y + dx * Math.sin(rad) + dy * Math.cos(rad);

  // `Check_Btn`: white on black(180), centred above the marker.
  return (
    <MuTipText
      text={marker.name}
      background="rgba(0,0,0,0.7)"
      style={{
        position: 'absolute',
        left: sx,
        top: sy - size / 2 - 2,
        transform: 'translate(-50%, -100%)',
        whiteSpace: 'nowrap',
      }}
    />
  );
};

const CloseButton = ({ onClick }: { onClick: () => void }) => {
  const sprite = useMuSprite(CLOSE_SPRITE);
  const [pressed, setPressed] = useState(false);
  const scaleX = CLOSE_BUTTON.width / CLOSE_FRAME.width;
  const scaleY = CLOSE_BUTTON.height / CLOSE_FRAME.height;

  return (
    <div
      className="minimap-close"
      title={t('common.close')}
      style={{
        left: CLOSE_BUTTON.x,
        top: CLOSE_BUTTON.y,
        width: CLOSE_BUTTON.width,
        height: CLOSE_BUTTON.height,
        backgroundImage: sprite ? `url(${sprite.url})` : undefined,
        backgroundSize: `${CLOSE_FRAME.width * scaleX}px ${sprite ? sprite.height * scaleY : 0}px`,
        backgroundPosition: `0 ${pressed ? -CLOSE_FRAME.height * scaleY : 0}px`,
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={uiClick(onClick)}
    />
  );
};

export const MinimapSheet = observer(() => {
  const open = Store.minimapEnabled;
  const world = Store.world;
  const map = open ? world?.mapIndex : undefined;
  const minimap = useWorldMinimap(map);
  const hero = useHeroTile(open);
  const partyMarkers = usePartyMarkers(open, map);
  const [zoom, setZoom] = useState(0);
  const [hovered, setHovered] = useState<MinimapMarker | null>(null);
  const scale = useUiStageScale();

  useEffect(() => {
    if (!open) setHovered(null);
  }, [open]);

  // `m_bSuccess == false`: a world without mini_map.ozt has no map to show.
  // An effect, not a render-time write: the store only changes in an action.
  useEffect(() => {
    if (open && minimap === null) {
      runInAction(() => {
        Store.minimapEnabled = false;
      });
    }
  }, [open, minimap]);

  if (!open) return null;
  if (minimap === null) return null;

  if (!minimap) return null;

  const mapSize = ZOOM_LEVELS[zoom];
  const tx = (hero.y / TERRAIN_SIZE) * mapSize;
  const ty = (hero.x / TERRAIN_SIZE) * mapSize;

  const close = () => {
    runInAction(() => {
      Store.minimapEnabled = false;
    });
  };

  const onWheel = (event: React.WheelEvent) => {
    setZoom(z =>
      Math.max(0, Math.min(ZOOM_LEVELS.length - 1, z + (event.deltaY < 0 ? 1 : -1)))
    );
  };

  return (
    <div
      className="minimap-overlay"
      style={{ background: `rgba(0,0,0,${SHEET_ALPHA})` }}
      onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        className="minimap-stage"
        style={{
          width: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <div className="minimap-clip">
          <div
            className="minimap-map"
            style={{
              width: mapSize,
              height: mapSize,
              left: CENTER_X - tx,
              top: CENTER_Y - ty,
              transformOrigin: `${tx}px ${ty}px`,
              transform: `rotate(${MAP_ROTATION}deg)`,
              backgroundImage: `url(${minimap.image.url})`,
            }}
          />
          {minimap.markers.map((marker, i) => (
            <Marker
              key={i}
              marker={marker}
              hero={hero}
              mapSize={mapSize}
              onHover={setHovered}
            />
          ))}
          {partyMarkers.map((marker, i) => (
            <Marker
              key={`party-${i}`}
              marker={marker}
              hero={hero}
              mapSize={mapSize}
              onHover={setHovered}
            />
          ))}
          <Sprite
            file={HERO_SPRITE}
            size={HERO_SIZE}
            style={{
              position: 'absolute',
              left: CENTER_X - HERO_SIZE / 2,
              top: CENTER_Y - HERO_SIZE / 2,
            }}
          />
          {hovered && <MarkerTip marker={hovered} hero={hero} mapSize={mapSize} />}
        </div>
        <Frame width={SHEET_WIDTH} height={SHEET_HEIGHT} />
        <CloseButton onClick={close} />
      </div>
    </div>
  );
});
