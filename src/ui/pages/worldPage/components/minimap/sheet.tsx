import { t } from '../../../../../i18n';
import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { uiClick } from '../../../../../libs/sfx';
import type { WorldMinimap } from '../../../../../libs/mu/minimap';
import type { MinimapMarker } from '../../../../../common/minimapData';
import { useMuSprite } from '../../../../components/muSprite';
import { MuTipText } from '../../../../components/muText';
import { useUiStageScale } from '../../../../components/uiStage';
import {
  CENTER_BUTTON,
  CenterButton,
  CLOSE_SPRITE,
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
  useHeroTile,
  useMapDrag,
  usePartyMarkers,
  useWorldMinimap,
  type MapPan,
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
 * Ours on top: click and drag slides the map off the hero, and a Center
 * button next to the X (shown only while off it) brings it back. The TAB
 * and Escape keys are handled by `Minimap` (`index.tsx`).
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

/** Left of the X, in its band. */
const CENTER_BUTTON_POS = { x: CLOSE_BUTTON.x - CENTER_BUTTON.width - 6, y: 4 };

const Marker = ({
  marker,
  center,
  mapSize,
  onHover,
}: {
  marker: MinimapMarker;
  center: MapPoint;
  mapSize: number;
  onHover: (marker: MinimapMarker | null) => void;
}) => {
  const size = MARKER_SIZE[marker.kind] ?? NPC_SIZE;
  // Offset from the view's centre in map pixels, before the 45° spin.
  const dx = ((marker.y - center.y) / TERRAIN_SIZE) * mapSize;
  const dy = ((marker.x - center.x) / TERRAIN_SIZE) * mapSize;

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
  center,
  mapSize,
}: {
  marker: MinimapMarker;
  center: MapPoint;
  mapSize: number;
}) => {
  const size = MARKER_SIZE[marker.kind] ?? NPC_SIZE;
  const dx = ((marker.y - center.y) / TERRAIN_SIZE) * mapSize;
  const dy = ((marker.x - center.x) / TERRAIN_SIZE) * mapSize;
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

/**
 * The open sheet. Mounted with it and gone with it, so the pan and the
 * hovered marker start clean every time; the zoom lives outside, across
 * opens.
 */
const SheetView = ({
  minimap,
  map,
  zoom,
  onWheel,
  close,
}: {
  minimap: WorldMinimap;
  map: number;
  zoom: number;
  onWheel: (event: React.WheelEvent) => void;
  close: () => void;
}) => {
  const hero = useHeroTile(true);
  const partyMarkers = usePartyMarkers(true, map);
  const [hovered, setHovered] = useState<MinimapMarker | null>(null);
  const [pan, setPan] = useState<MapPan>(NO_PAN);
  const scale = useUiStageScale();
  const mapSize = ZOOM_LEVELS[zoom];
  const { dragging, handlers } = useMapDrag(mapSize, scale, setPan);

  const center: MapPoint = { x: hero.x + pan.v, y: hero.y + pan.u };
  const tx = (center.y / TERRAIN_SIZE) * mapSize;
  const ty = (center.x / TERRAIN_SIZE) * mapSize;
  // The hero sits off the centre by the pan, upright as the original draws it.
  const heroDx = (-pan.u / TERRAIN_SIZE) * mapSize;
  const heroDy = (-pan.v / TERRAIN_SIZE) * mapSize;

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
          // Centred by half the *scaled* width: the stage scales from its
          // top-left corner, so an unscaled margin left it off to the right.
          marginLeft: (-SHEET_WIDTH / 2) * scale,
          transform: `scale(${scale})`,
        }}
      >
        <div className={`minimap-clip${dragging ? ' is-dragging' : ''}`} {...handlers}>
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
              center={center}
              mapSize={mapSize}
              onHover={setHovered}
            />
          ))}
          {partyMarkers.map((marker, i) => (
            <Marker
              key={`party-${i}`}
              marker={marker}
              center={center}
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
              transform: `rotate(${MAP_ROTATION}deg) translate(${heroDx}px, ${heroDy}px) rotate(${-MAP_ROTATION}deg)`,
            }}
          />
          {hovered && <MarkerTip marker={hovered} center={center} mapSize={mapSize} />}
        </div>
        <Frame width={SHEET_WIDTH} height={SHEET_HEIGHT} />
        {isPanned(pan) && (
          <CenterButton
            onClick={() => setPan(NO_PAN)}
            style={{ position: 'absolute', left: CENTER_BUTTON_POS.x, top: CENTER_BUTTON_POS.y }}
          />
        )}
        <CloseButton onClick={close} />
      </div>
    </div>
  );
};

export const MinimapSheet = observer(() => {
  const open = Store.minimapEnabled;
  const world = Store.world;
  const map = open ? world?.mapIndex : undefined;
  const minimap = useWorldMinimap(map);
  const [zoom, setZoom] = useState(0);

  // `m_bSuccess == false`: a world without mini_map.ozt has no map to show.
  // An effect, not a render-time write: the store only changes in an action.
  useEffect(() => {
    if (open && minimap === null) {
      runInAction(() => {
        Store.minimapEnabled = false;
      });
    }
  }, [open, minimap]);

  if (!open || !minimap || map === undefined) return null;

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

  return <SheetView minimap={minimap} map={map} zoom={zoom} onWheel={onWheel} close={close} />;
});
