import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { t } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { Social } from '../../../../../social';
import { loadWorldMinimap, type WorldMinimap } from '../../../../../libs/mu/minimap';
import { MinimapMarkerKind, type MinimapMarker } from '../../../../../common/minimapData';
import { useMuSprite } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';

/**
 * What the sheet and the corner panel share: the art, the marker tables and
 * the hooks that read the world. The sizes are the original's, in its
 * 640x480 UI space; each view scales them its own way.
 */

export const MAP_ROTATION = 45;
export const TERRAIN_SIZE = 256;

export const NPC_SIZE = 15;
export const PORTAL_SIZE = 30;
export const HERO_SIZE = 12;
export const PARTY_SIZE = 15;

export const EDGE_WIDTH = 35;
export const EDGE_HEIGHT = 6;

export const CORNER_SPRITE = 'mini_map_ui_corner.OZT';
export const LINE_SPRITE = 'mini_map_ui_line.OZJ';
export const HERO_SPRITE = 'mini_map_ui_cha.OZT';
export const PORTAL_SPRITE = 'mini_map_ui_portal.OZT';
export const NPC_SPRITE = 'mini_map_ui_npc.OZT';
export const PARTY_SPRITE = 'mini_map_ui_party.OZT';
export const CLOSE_SPRITE = 'mini_map_ui_cancel.OZT';

export type MapPoint = { x: number; y: number };

/** Our own marker kind for party members; not in the file format. */
export const PARTY_KIND = 3;

export const MARKER_SIZE: Record<number, number> = {
  [MinimapMarkerKind.Npc]: NPC_SIZE,
  [MinimapMarkerKind.Portal]: PORTAL_SIZE,
  [PARTY_KIND]: PARTY_SIZE,
};

export const MARKER_SPRITE: Record<number, string> = {
  [MinimapMarkerKind.Npc]: NPC_SPRITE,
  [MinimapMarkerKind.Portal]: PORTAL_SPRITE,
  [PARTY_KIND]: PARTY_SPRITE,
};

/**
 * The decoded map of `map`: `undefined` while it loads, `null` for a world
 * without `mini_map.ozt` (`m_bSuccess == false`).
 */
export function useWorldMinimap(map: number | undefined): WorldMinimap | null | undefined {
  // Keyed by map, so a warp reads as "loading" until its own map arrives.
  const [loaded, setLoaded] = useState<{
    map: number;
    minimap: WorldMinimap | null;
  } | null>(null);

  useEffect(() => {
    if (map === undefined) return;

    let cancelled = false;

    loadWorldMinimap(map).then(
      minimap => {
        if (!cancelled) setLoaded({ map, minimap });
      },
      err => {
        console.error(`Could not load the minimap of world ${map}:`, err);
        if (!cancelled) setLoaded({ map, minimap: null });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [map]);

  return loaded && loaded.map === map ? loaded.minimap : undefined;
}

/**
 * Party members on this map (ours: `mini_map_ui_party.tga` ships but the
 * original never draws it). A member in scope is followed live through the
 * entity; otherwise the last `PartyList` position is used. They are
 * `MinimapMarker`s so the hover tip and placement code are shared.
 */
const NO_MARKERS: MinimapMarker[] = [];

export function usePartyMarkers(active: boolean, map: number | undefined): MinimapMarker[] {
  const [markers, setMarkers] = useState<MinimapMarker[]>(NO_MARKERS);

  useEffect(() => {
    if (!active || map === undefined) return;

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

    const id = setInterval(sample, 250);
    return () => clearInterval(id);
  }, [active, map]);

  return active && map !== undefined ? markers : NO_MARKERS;
}

/** The hero's tile position, refreshed every frame while `active`. */
export function useHeroTile(active: boolean): MapPoint {
  const [tile, setTile] = useState<MapPoint>({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) return;

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
  }, [active]);

  return tile;
}

export const Sprite = ({
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

/**
 * The frame around a `width` x `height` map: the line strip along each edge
 * (the sides are the top strip turned 90 degrees, `RenderBitmapRotate`) and
 * the corner piece mirrored into each corner.
 */
export const Frame = ({ width, height }: { width: number; height: number }) => {
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
          width: height,
          left: 0,
          transform: `rotate(90deg) translateY(-${EDGE_HEIGHT}px)`,
        }}
      />
      <div
        className="minimap-edge minimap-edge-side"
        style={{ ...lineStyle, width: height, left: width, transform: 'rotate(90deg)' }}
      />
      <div className="minimap-corner minimap-corner-tl" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-tr" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-bl" style={cornerStyle} />
      <div className="minimap-corner minimap-corner-br" style={cornerStyle} />
    </>
  );
};

/**
 * How far the view has been dragged off the hero (ours: the original pins
 * the hero to the centre), in tiles along the picture's U (tile Y) and V
 * (tile X). Tiles rather than pixels, so a zoom step keeps the same tile
 * under the centre.
 */
export type MapPan = { u: number; v: number };

export const NO_PAN: MapPan = { u: 0, v: 0 };

export const isPanned = (pan: MapPan): boolean => pan.u !== 0 || pan.v !== 0;

/**
 * A pointer moved `sx, sy` screen pixels with the picture in hand: undo the
 * view's CSS scale, then the 45° spin, and the tile under the fixed centre
 * went the other way.
 */
export function dragToPan(sx: number, sy: number, mapSize: number, scale: number): MapPan {
  const rad = (MAP_ROTATION * Math.PI) / 180;
  const px = sx / scale;
  const py = sy / scale;
  const mu = px * Math.cos(rad) + py * Math.sin(rad);
  const mv = -px * Math.sin(rad) + py * Math.cos(rad);
  return {
    u: (-mu / mapSize) * TERRAIN_SIZE,
    v: (-mv / mapSize) * TERRAIN_SIZE,
  };
}

/**
 * Click and drag on the map picture. The pointer is captured on the element
 * the handlers go on, so a drag that leaves it (or the window) keeps
 * following until the button comes up.
 */
export function useMapDrag(
  mapSize: number,
  scale: number,
  setPan: React.Dispatch<React.SetStateAction<MapPan>>
): {
  dragging: boolean;
  handlers: Pick<
    React.DOMAttributes<HTMLDivElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'
  >;
} {
  const [dragging, setDragging] = useState(false);
  const held = useRef<{ id: number; x: number; y: number } | null>(null);

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (held.current?.id !== e.pointerId) return;
    held.current = null;
    setDragging(false);
  };

  return {
    dragging,
    handlers: {
      onPointerDown: e => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        held.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setDragging(true);
      },
      onPointerMove: e => {
        const h = held.current;
        if (!h || h.id !== e.pointerId) return;
        const d = dragToPan(e.clientX - h.x, e.clientY - h.y, mapSize, scale);
        h.x = e.clientX;
        h.y = e.clientY;
        setPan(p => ({ u: p.u + d.u, v: p.v + d.v }));
      },
      onPointerUp: end,
      onPointerCancel: end,
    },
  };
}

/** `newui_btn_empty_very_small`: three 54x23 plates, up / lit / pressed. */
const CENTER_SPRITE = 'newui_btn_empty_very_small.OZT';
export const CENTER_BUTTON = { width: 54, height: 23 };

/** Back to the hero. The plate the original's small windows put their own labels on. */
export const CenterButton = ({
  onClick,
  style,
}: {
  onClick: () => void;
  style?: CSSProperties;
}) => (
  <div className="minimap-center" style={style}>
    <MuButton
      file={CENTER_SPRITE}
      width={CENTER_BUTTON.width}
      height={CENTER_BUTTON.height}
      frames={{ up: 0, active: 1, down: 2 }}
      label={t('minimap.center')}
      labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
      onClick={onClick}
    />
  </div>
);
