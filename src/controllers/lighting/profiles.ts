import { ENUM_WORLD } from '../../core/types';
import { maps, type MapLayer } from '../maps';

export type Rgb = readonly [number, number, number];

/**
 * A map's look: the whole per-map surface.
 * Pure data; the director composes it, nothing here touches Babylon.
 */
export type LookProfile = {
  /** Exposure in stops over unity. Classic ignores it. */
  readonly ev: number;
  /** Per-channel multiplier, each within [0.94, 1.06]. Applied luma-neutral. */
  readonly whiteBalance: Rgb;
  /** The sky the dome draws and the haze reads (sky_atmospherics §3). Null = enclosed. */
  readonly sky: SkyLook | null;
  /**
   * Distance-gated haze (§4.8): `cap x (1 - exp(-density x max(0, dist - start)))`,
   * in tiles; 0 density = no pass. `height` is the small extra density at
   * ground level that thins upward; `color` overrides the horizon for maps
   * with no sky (Atlans).
   */
  readonly fog: {
    readonly start: number;
    readonly density: number;
    readonly cap: number;
    readonly height: number;
    readonly color: Rgb | null;
  };
  /**
   * Fog filling the bottom of the world under `top`, thickening downward and integrated along
   * the ray (Devias' `NoGround` ravines). `top` sits under the lowest walkable ground; omit for maps without holes.
   */
  readonly underworld?: {
    /** World height the fog starts under. */
    readonly top: number;
    /** Density at `top`, per tile of ray travelled. */
    readonly density: number;
    /** How fast it thickens below that: e-folds per tile of descent. */
    readonly falloff: number;
    /** What a ray that never comes out of it ends up. */
    readonly color: Rgb;
  };
  /**
   * Sun direction for the shaped key and its share of the key total; the sky
   * takes the rest, and a shadow removes exactly the share (§3.2).
   */
  readonly sun: SunSpec;
};

export type SunSpec = {
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly share: number;
};

/**
 * A map's sky. `horizon` is also the haze
 * colour, so moving a graded map's pair moves its whole far field: the five
 * maps that were graded on their pair keep it and take only the new terms.
 */
export type SkyLook = {
  readonly zenith: Rgb;
  readonly horizon: Rgb;
  /** Horizon-to-zenith exponent. 1 is the flat linear ramp; above it the horizon band tightens. */
  readonly curve?: number;
  /** The sun disc and its halo, display sRGB; null for an overcast map with no disc. */
  readonly sun?: Rgb | null;
  /** Halo strength around the sun. */
  readonly halo?: number;
  /** Base cloud coverage, 0..1. 0 is a clear sky: no deck, no drift, no shadows. */
  readonly clouds?: number;
  /** Far scenery on the skyline; omit for a map whose ground is all there is. */
  readonly skyline?: SkylineLook;
};

/**
 * A painted horizon (sky_atmospherics §10): a panorama strip wrapped around
 * the camera past everything the map draws, so the ground reads as ending in
 * a country rather than in the haze. Nothing the original client had.
 *
 * The angles place the strip's two edges against the eye line, so the art's
 * own skyline lands where its split says it does - Lorencia's sits 52% down
 * the strip, so 6.8 up against 6.2 down puts it on the eye.
 */
export type SkylineLook = {
  /** The strip, served from `public/`. */
  readonly art: string;
  /** Degrees its top edge stands above the eye line. */
  readonly riseDeg: number;
  /** Degrees its bottom edge sits below the eye line. */
  readonly dropDeg: number;
  /** How far the art is pulled toward this sky's horizon colour, 0..1. */
  readonly haze: number;
  /** Fraction of the strip's height its bottom edge dissolves over. */
  readonly fade: number;
};

export const SKY_CURVE_DEFAULT = 0.75;
export const SKY_HALO_DEFAULT = 0.25;
export const SKY_CLOUDS_DEFAULT = 0.4;
export const SKY_SUN_DEFAULT: Rgb = [1.0, 0.96, 0.88];

/** Open sky. Under a roof the bake carries the room, so the key is mostly sky. */
export const OPEN_SUN_SHARE = 0.6;
export const ENCLOSED_SUN_SHARE = 0.15;

const sun = (
  azimuthDeg: number,
  elevationDeg: number,
  share = OPEN_SUN_SHARE
): SunSpec => ({ azimuthDeg, elevationDeg, share });

export const NO_FOG: LookProfile['fog'] = {
  start: 0,
  density: 0,
  cap: 0,
  height: 0,
  color: null,
};

/** The open default's sky; a map's own look row names its own. */
const OPEN_SKY: SkyLook = {
  zenith: [0.34, 0.55, 0.87],
  horizon: [0.72, 0.80, 0.90],
  clouds: 0.16,
};

const OPEN_HAZE: LookProfile['fog'] = {
  start: 25,
  density: 0.008,
  cap: 0.9,
  height: 0,
  color: null,
};

const NOON_SUN = sun(215, 48);

/** The interior key: the roof takes the sun, what is left comes from the bake. */
const INTERIOR_SUN = sun(0, 60, ENCLOSED_SUN_SHARE);

/** An open map with no look row of its own. */
export const DEFAULT_PROFILE: LookProfile = {
  ev: 1.3,
  whiteBalance: [1, 1, 1],
  sky: OPEN_SKY,
  fog: OPEN_HAZE,
  sun: NOON_SUN,
};

/** An enclosed map (no `outdoor`) with no look row of its own. */
const ENCLOSED_PROFILE: LookProfile = {
  ...DEFAULT_PROFILE,
  sky: null,
  fog: NO_FOG,
  sun: INTERIOR_SUN,
};

/**
 * A map's look as its folder writes it (`MapLighting.look`): laid over the
 * open default, or over the enclosed one with `over: 'enclosed'`, so a row
 * only names what differs.
 */
export type MapLook = Partial<LookProfile> & {
  readonly over?: 'open' | 'enclosed';
};

/**
 * Worlds no map entry claims, so they have no folder to carry a row: Crywolf
 * 2nd keeps the 1st's sky.
 */
const UNCLAIMED: Partial<Record<ENUM_WORLD, MapLook>> = {
  [ENUM_WORLD.WD_35CRYWOLF_2ND]: {
    sky: { zenith: [0.45, 0.56, 0.78], horizon: [0.72, 0.72, 0.74], clouds: 0.24 },
  },
};

const lookOf = (l: MapLayer) => l.lighting?.look;

/** Each row laid over its default, once. */
const composed = new WeakMap<MapLook, LookProfile>();

function compose(row: MapLook): LookProfile {
  let out = composed.get(row);
  if (!out) {
    const { over, ...own } = row;
    out = { ...(over === 'enclosed' ? ENCLOSED_PROFILE : DEFAULT_PROFILE), ...own };
    composed.set(row, out);
  }
  return out;
}

/** The map's look: its own row over a default, else the default its sky picks. */
export function profileFor(world: ENUM_WORLD): LookProfile {
  const own = maps.rowFor(world, lookOf) ?? UNCLAIMED[world];
  if (own) return compose(own);

  return maps.isOutdoor(world) ? DEFAULT_PROFILE : ENCLOSED_PROFILE;
}

/** A lit interior inside a map: what it changes over the map's own profile. */
export type AreaLook = {
  /**
   * The room's level in key units, where 1.0 is the bake at its authored
   * value (§13 F14). It scales the rig, the ground bake and the room's
   * emitters together, so the room keeps the bake's own colour under its
   * candles instead of drowning in the delta at the map's outdoor level.
   */
  readonly keyLevel: number;
  readonly whiteBalance: Rgb;
  /** How much more than the room's own level its emitters get; 1 is Classic. */
  readonly candles: number;
  /** The room's key direction: near vertical, a low share, contact grounding only. */
  readonly sun: SunSpec;
};

/** A room's floor in tiles, between the inner wall faces: the mask's frame and the roof lift's seed. */
export type AreaRect = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** The floor with its heights: what the room mask draws inside of (§13 F8). */
export type RoomVolume = AreaRect & {
  /** Height the walls stand at. */
  readonly floorY: number;
  /** Top of the walls: a ray through the wall box below this height sees through an opening. */
  readonly wallTop: number;
  /** Underside of the roof: the room volume's ceiling. */
  readonly roofY: number;
};

export function roomVolumeOf(
  min: { x: number; y: number },
  max: { x: number; y: number },
  heights: { floorY: number; wallHeight: number; roofHeight: number }
): RoomVolume {
  return {
    minX: min.x,
    minY: min.y,
    maxX: max.x,
    maxY: max.y,
    floorY: heights.floorY,
    wallTop: heights.floorY + heights.wallHeight,
    roofY: heights.floorY + heights.roofHeight,
  };
}

/**
 * The room's key is cast from near vertical so the furniture's shadow is
 * contact grounding, at a share the eye reads as occlusion rather than a sun
 * (§13 F14).
 */
const ROOM_SUN = sun(0, 80, 0.3);

const WARM_ROOM: Rgb = [1.03, 1.0, 0.96];

/**
 * A room look as a map writes it (`MapLighting.areas`): its level and its
 * candles. The warm balance and the near-vertical key are every room's.
 */
export type MapArea = {
  /** The room's level in key units (`AreaLook.keyLevel`). */
  readonly keyLevel: number;
  /** How much more than the room's own level its emitters get (`AreaLook.candles`). */
  readonly candles: number;
};

/** A room look's name, as a map's `create` registers it (`lorenciaTavern`). */
export type AreaLookName = string;

/** Every map's room looks by name, built on first ask; rebuilt when the list grows. */
let areas: { readonly from: number; readonly byName: Map<string, AreaLook> } | null =
  null;

/** The room look a map declared under `name`, or undefined for none. */
export function areaProfile(name: AreaLookName): AreaLook | undefined {
  const all = maps.all;
  if (areas?.from !== all.length) {
    const byName = new Map<string, AreaLook>();
    for (const layer of all) {
      for (const [key, row] of Object.entries(layer.lighting?.areas ?? {})) {
        byName.set(key, {
          keyLevel: row.keyLevel,
          whiteBalance: WARM_ROOM,
          candles: row.candles,
          sun: ROOM_SUN,
        });
      }
    }
    areas = { from: all.length, byName };
  }
  return areas.byName.get(name);
}

/** The map's profile with an area laid over it: no sky, no haze, its own balance and key direction; the map's ev stays. */
export function applyArea(base: LookProfile, area: AreaLook): LookProfile {
  return {
    ...base,
    whiteBalance: area.whiteBalance,
    sky: null,
    fog: NO_FOG,
    sun: area.sun,
  };
}

const DEG = Math.PI / 180;

/** Unit direction the light travels, Babylon Y-up, from azimuth / elevation. */
export function sunDirectionOf(sun: LookProfile['sun']): [number, number, number] {
  const az = sun.azimuthDeg * DEG;
  const el = sun.elevationDeg * DEG;
  const c = Math.cos(el);

  return [-Math.sin(az) * c, -Math.sin(el), -Math.cos(az) * c];
}

/** sRGB display value to linear, per channel. */
export function toLinear(c: Rgb): [number, number, number] {
  return [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2];
}

/**
 * An event's modifier over whatever map and area are already resolved. An
 * area *replaces* a profile (`applyArea`); an omen only scales it, so the two
 * compose instead of fighting and the map keeps its own look underneath.
 */
export type OmenLook = {
  /** Multiplier on the lit scene's level (`LookState.key.sceneGain`). */
  readonly dim: number;
  /** Composed over the map's balance, then clamped back into range. */
  readonly whiteBalance: Rgb;
};

export const NO_OMEN: OmenLook = { dim: 1, whiteBalance: [1, 1, 1] };

/**
 * A dragon invasion. The original subtracts `(0.3, 0.3, 0.2)` from the terrain
 * light in a 16-tile disc around the hero for as long as the event is lit
 * (GOBoid.cpp:1221-1222): on a mid bake of 0.75 that leaves 0.6 of the level,
 * and it takes more red and green than blue, so what is left is colder than
 * what went in. Both numbers are that subtraction, expressed as a scale
 * because the clone's light has one.
 */
const INVASION: OmenLook = {
  dim: 0.6,
  whiteBalance: [0.97, 0.99, 1.05],
};

const OMENS = {
  invasion: INVASION,
} satisfies Record<string, OmenLook>;

export type OmenLookName = keyof typeof OMENS;

export function omenProfile(name: OmenLookName): OmenLook {
  return OMENS[name];
}

/** The balance range the profile type promises, per channel. */
const BALANCE_MIN = 0.94;
const BALANCE_MAX = 1.06;

/** The map's balance with an omen's laid over it, kept inside the range. */
export function composeBalance(base: Rgb, omen: Rgb): Rgb {
  return [
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[0] * omen[0])),
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[1] * omen[1])),
    Math.min(BALANCE_MAX, Math.max(BALANCE_MIN, base[2] * omen[2])),
  ];
}
