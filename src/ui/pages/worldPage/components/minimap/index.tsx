import { isKey } from '../../../../../common/keyBindings';
import { t } from '../../../../../i18n';
import './style.less';
import { useEffect, useState, type CSSProperties } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { Social } from '../../../../../social';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { loadWorldMinimap, type WorldMinimap } from '../../../../../libs/mu/minimap';
import { MinimapMarkerKind, type MinimapMarker } from '../../../../../common/minimapData';
import { useMuSprite } from '../../../../components/muSprite';
import { MuTipText } from '../../../../components/muText';
import { useUiStageScale } from '../../../../components/uiStage';

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
 */

const HOT_KEY = 'minimap';

const SHEET_WIDTH = 640;
const SHEET_HEIGHT = 430;
const SHEET_ALPHA = 0.85;
const CENTER_X = 320;
const CENTER_Y = 240;
const MAP_ROTATION = 45;
const TERRAIN_SIZE = 256;

/** `m_Lenth[]`: map edge length per zoom step. */
const ZOOM_LEVELS = [800, 1000, 1200, 1400, 1600, 1800];

const NPC_SIZE = 15;
const PORTAL_SIZE = 30;
const HERO_SIZE = 12;
const PARTY_SIZE = 15;

const EDGE_WIDTH = 35;
const EDGE_HEIGHT = 6;

const CLOSE_BUTTON = { x: 640 - 27, y: 3, width: 30, height: 25 };
const CLOSE_FRAME = { width: 36, height: 29 };

const CORNER_SPRITE = 'mini_map_ui_corner.OZT';
const LINE_SPRITE = 'mini_map_ui_line.OZJ';
const HERO_SPRITE = 'mini_map_ui_cha.OZT';
const PORTAL_SPRITE = 'mini_map_ui_portal.OZT';
const NPC_SPRITE = 'mini_map_ui_npc.OZT';
const PARTY_SPRITE = 'mini_map_ui_party.OZT';
const CLOSE_SPRITE = 'mini_map_ui_cancel.OZT';

type MapPoint = { x: number; y: number };

/** Our own marker kind for party members; not in the file format. */
const PARTY_KIND = 3;

const MARKER_SIZE: Record<number, number> = {
  [MinimapMarkerKind.Npc]: NPC_SIZE,
  [MinimapMarkerKind.Portal]: PORTAL_SIZE,
  [PARTY_KIND]: PARTY_SIZE,
};

const MARKER_SPRITE: Record<number, string> = {
  [MinimapMarkerKind.Npc]: NPC_SPRITE,
  [MinimapMarkerKind.Portal]: PORTAL_SPRITE,
  [PARTY_KIND]: PARTY_SPRITE,
};

function useWorldMinimap(map: number | undefined): WorldMinimap | null | undefined {
  const [minimap, setMinimap] = useState<WorldMinimap | null | undefined>(undefined);

  useEffect(() => {
    if (map === undefined) {
      setMinimap(undefined);
      return;
    }

    let cancelled = false;
    setMinimap(undefined);

    loadWorldMinimap(map).then(
      loaded => {
        if (!cancelled) setMinimap(loaded);
      },
      err => {
        console.error(`Could not load the minimap of world ${map}:`, err);
        if (!cancelled) setMinimap(null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [map]);

  return minimap;
}

/** The hero's tile position, refreshed every frame while the map is open. */
/**
 * Party members on this map (ours: `mini_map_ui_party.tga` ships but the
 * original never draws it). A member in scope is followed live through the
 * entity; otherwise the last `PartyList` position is used. They are
 * `MinimapMarker`s so the hover tip and placement code are shared.
 */
function usePartyMarkers(open: boolean, map: number | undefined): MinimapMarker[] {
  const [markers, setMarkers] = useState<MinimapMarker[]>([]);

  useEffect(() => {
    if (!open || map === undefined) {
      setMarkers([]);
      return;
    }

    const sample = () => {
      const world = Store.world;
      const heroName = Store.playerData.name;
      if (!world) return;

      const next: MinimapMarker[] = [];
      for (const member of Social.partyMembers) {
        if (member.name === heroName || member.mapId !== map) continue;

        let x = member.x;
        let y = member.y;
        for (const e of world.playersQuery.entities) {
          if (e.localPlayer || e.objectNameInWorld !== member.name) continue;
          x = e.transform.pos.x;
          y = e.transform.pos.z;
          break;
        }
        next.push({ kind: PARTY_KIND, x, y, rotation: 0, name: member.name });
      }

      setMarkers(prev =>
        prev.length === next.length &&
        prev.every((m, i) => m.x === next[i].x && m.y === next[i].y && m.name === next[i].name)
          ? prev
          : next
      );
    };

    sample();
    const id = setInterval(sample, 250);
    return () => clearInterval(id);
  }, [open, map]);

  return markers;
}

function useHeroTile(open: boolean): MapPoint {
  const [tile, setTile] = useState<MapPoint>({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    let last = { x: NaN, y: NaN };

    const tick = () => {
      const pos = Store.world?.playerEntity?.transform?.pos;
      if (pos) {
        const next = { x: pos.x, y: pos.z };
        if (next.x !== last.x || next.y !== last.y) {
          last = next;
          setTile(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return tile;
}

const Sprite = ({
  file,
  size,
  style,
  children,
}: {
  file: string;
  size: number;
  style?: CSSProperties;
  children?: React.ReactNode;
}) => {
  const sprite = useMuSprite(file);

  return (
    <div
      className="minimap-sprite"
      style={{
        width: size,
        height: size,
        backgroundImage: sprite ? `url(${sprite.url})` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

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

const Frame = () => {
  const line = useMuSprite(LINE_SPRITE);
  const corner = useMuSprite(CORNER_SPRITE);
  const lineStyle: CSSProperties = {
    backgroundImage: line ? `url(${line.url})` : undefined,
    backgroundSize: `${EDGE_WIDTH}px ${EDGE_HEIGHT}px`,
  };
  const cornerStyle: CSSProperties = {
    backgroundImage: corner ? `url(${corner.url})` : undefined,
  };

  return (
    <>
      <div className="minimap-edge minimap-edge-top" style={lineStyle} />
      <div className="minimap-edge minimap-edge-bottom" style={lineStyle} />
      <div
        className="minimap-edge minimap-edge-side"
        style={{
          ...lineStyle,
          left: 0,
          transform: `rotate(90deg) translateY(-${EDGE_HEIGHT}px)`,
        }}
      />
      <div
        className="minimap-edge minimap-edge-side"
        style={{ ...lineStyle, left: SHEET_WIDTH, transform: "rotate(90deg)" }}
      />
      <div className="minimap-corner minimap-corner-tl" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-tr" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-bl" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-br" style={cornerStyle} />
    </>
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

export const Minimap = observer(() => {
  const open = Store.minimapEnabled;
  const world = Store.world;
  const map = open ? world?.mapIndex : undefined;
  const minimap = useWorldMinimap(map);
  const hero = useHeroTile(open);
  const partyMarkers = usePartyMarkers(open, map);
  const [zoom, setZoom] = useState(0);
  const [hovered, setHovered] = useState<MinimapMarker | null>(null);
  const scale = useUiStageScale();

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      if (!Store.world?.playerEntity) return;
      runInAction(() => {
        Store.minimapEnabled = !Store.minimapEnabled;
      });
      playUiSound('click');
    } else if (key === 'Escape' && Store.minimapEnabled) {
      runInAction(() => {
        Store.minimapEnabled = false;
      });
      playUiSound('click');
    }
  });

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
        <Frame />
        <CloseButton onClick={close} />
      </div>
    </div>
  );
});
