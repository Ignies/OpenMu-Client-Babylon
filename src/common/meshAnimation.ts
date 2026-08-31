import { ENUM_WORLD } from './types';
import {
  CURSED_TEMPLE_WORLDS,
  EMPIRE_GUARDIAN_WORLDS,
  onWorlds,
} from './worldAssets';

/**
 * The per-frame mesh writes the original does from `MoveObject`:
 * `o->BlendMeshTexCoordU/V` (a UV offset on one mesh) and `o->BlendMeshLight`
 * (that mesh's brightness). Both are pure functions of `WorldTime`, identical
 * for every instance of a type, so they live in a table rather than in a
 * class per object.
 *
 * `mesh` names which mesh the writes land on:
 *  - `blend` — the mesh the object already declares as its `BlendMesh`
 *    (additive, unlit). The original sets `o->BlendMesh = N` in the same
 *    `MoveObject` case.
 *  - `stream` — `Models[type].StreamMesh = N`: drawn *textured but unlit*,
 *    flat `BodyLight` instead of the per-vertex terrain light
 *    (ZzzBMD.cpp:990-1001). That is the sand-fall / waterfall look.
 *
 * Time is milliseconds, matching `WorldTime`. Note `-(int)WorldTime % 1000`
 * in C parses as `((-(int)WorldTime) % 1000)` — `%` keeps the dividend's
 * sign — so it ramps 0 → -0.999 and wraps, which is what `-(t % 1000)` gives
 * for positive `t`.
 */
export type MeshAnimation = {
  /** Which mesh index the writes target. */
  readonly mesh: number;
  /** `stream`: unlit + scrolling. `blend`: the additive BlendMesh. */
  readonly kind: 'stream' | 'blend';
  readonly u?: (timeMs: number) => number;
  readonly v?: (timeMs: number) => number;
  /** Animated `o->BlendMeshLight`; `blend` meshes only. */
  readonly light?: (timeMs: number) => number;
};

const saw = (period: number, rate: number) => (t: number) =>
  -((t % period) * rate);

const sawUp = (period: number, rate: number) => (t: number) =>
  (t % period) * rate;

/**
 * Dungeon (ZzzObject.cpp:3830-3835). Types 22/23/24 are the same squid01/02
 * flesh curtain in three variants; the original sets `StreamMesh = 1` every
 * frame and scrolls V a whole texture per second, downward.
 */
const DUNGEON: Partial<Record<number, MeshAnimation>> = {
  22: { mesh: 1, kind: 'stream', v: saw(1000, 0.001) },
  23: { mesh: 1, kind: 'stream', v: saw(1000, 0.001) },
  24: { mesh: 1, kind: 'stream', v: saw(1000, 0.001) },
};

/**
 * Noria (ZzzObject.cpp:3925-3944). 18 is the mill wheel's water, 41 the
 * stream, 42/43 a mirrored pair of waterfall curtains — hence the opposite
 * U signs.
 */
const NORIA: Partial<Record<number, MeshAnimation>> = {
  18: { mesh: 2, kind: 'blend', v: sawUp(1000, 0.001) },
  41: { mesh: 0, kind: 'blend', v: sawUp(2000, 0.0005) },
  42: { mesh: 0, kind: 'stream', u: saw(500, 0.002) },
  43: { mesh: 0, kind: 'stream', u: sawUp(500, 0.002) },
};

/**
 * Lost Tower (ZzzObject.cpp:3952-3966). 3/4 are the glowing conduits — the
 * original scrolls them and then re-draws mesh 1 through `StreamMesh` with a
 * chrome pass (`Draw_RenderObject`:1002); we keep the scroll and the unlit
 * pass, the chrome layer is materials work. 19/20 are the two tower machines.
 */
const LOST_TOWER: Partial<Record<number, MeshAnimation>> = {
  3: { mesh: 1, kind: 'stream', u: saw(1000, 0.001) },
  4: { mesh: 1, kind: 'stream', u: saw(1000, 0.001) },
  19: { mesh: 4, kind: 'blend', u: saw(1000, 0.001) },
  20: { mesh: 4, kind: 'blend', u: saw(1000, 0.001) },
};

/** Stadium (ZzzObject.cpp:3996-3999): the fountain basin, mesh 3 = water.jpg. */
const STADIUM: Partial<Record<number, MeshAnimation>> = {
  21: { mesh: 3, kind: 'blend', v: saw(1000, 0.001) },
};

/**
 * Atlans (ZzzObject.cpp:4012-4034). No UV scroll at all here — the movement
 * is baked into the BMD bone animation. What the original does animate is
 * `BlendMeshLight`, a slow breathing on the water plane (23), the two coral
 * lamps (32/34) and the anemone (40).
 */
const ATLANS: Partial<Record<number, MeshAnimation>> = {
  23: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.002) * 0.3 + 0.5 },
  32: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  34: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  40: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.3 + 0.5 },
};

/**
 * Tarkan (ZzzObject.cpp:4041-4128, `StreamMesh` set at load in
 * MapManager.cpp:1134). The sand-falls are the point of this table: six
 * sheets scrolling V over a 10 s loop, plus 12 which drifts diagonally over
 * 50 s. 61/65/66 are the braziers (their terrain light is in effectLights).
 */
const TARKAN: Partial<Record<number, MeshAnimation>> = {
  2: { mesh: 0, kind: 'blend', u: saw(1000, 0.001) },
  11: { mesh: 0, kind: 'stream', v: saw(10000, 0.0002) },
  12: {
    mesh: 0,
    kind: 'stream',
    u: saw(50000, 0.00005),
    v: saw(50000, 0.00005),
  },
  13: { mesh: 0, kind: 'stream', v: saw(10000, 0.0002) },
  61: { mesh: 1, kind: 'blend', v: saw(1000, 0.001) },
  65: { mesh: 1, kind: 'blend', v: saw(1000, 0.001) },
  66: { mesh: 1, kind: 'blend', v: saw(1000, 0.001) },
  72: { mesh: 0, kind: 'blend', v: saw(10000, 0.0002) },
  73: { mesh: 0, kind: 'stream', v: saw(10000, 0.0002) },
  75: { mesh: 0, kind: 'stream', v: saw(10000, 0.0002) },
  79: { mesh: 0, kind: 'stream', v: saw(10000, 0.0002) },
};

/**
 * A per-25-Hz-tick increment (`o->BlendMeshTexCoordV += k` each `MoveObject`,
 * the Season 3+ idiom) as a function of milliseconds: `k` per 40 ms, wrapped
 * to the texture.
 */
const perTick = (k: number) => (t: number) => ((t * k) / 40) % 1;

/**
 * Aida (GMAida.cpp:49-54, :283-320). 25/28 scroll V down `0.015`/tick;
 * 65/66 and 77/78 are drawn by `RenderAidaObjectVisual` with an explicit
 * `RenderMesh(0, RENDER_TEXTURE, …, U)` — a plain textured pass, so
 * `stream` rather than `blend`. Mesh indices for 25/28 are not set in the
 * C++ (the BMD's own blend flag decides); 0 is the single-mesh case.
 */
const AIDA: Partial<Record<number, MeshAnimation>> = {
  25: { mesh: 0, kind: 'blend', v: t => -perTick(0.015)(t) },
  28: { mesh: 0, kind: 'blend', v: t => -perTick(0.015)(t) },
  65: { mesh: 0, kind: 'stream', u: saw(100000, 0.00005) },
  66: { mesh: 0, kind: 'stream', u: saw(100000, 0.00005) },
  77: { mesh: 0, kind: 'stream', u: sawUp(100000, 0.0002) },
  78: { mesh: 0, kind: 'stream', u: sawUp(100000, 0.0002) },
};

/**
 * Kanturu Ruins (GM_kanturu_1st.cpp:64-69, :92-96, :113-115): the great
 * wheel's glow (46), the waterfall sheet (77) and the crystal (102). Shared
 * with the GM area (40) and Doppelganger 4 (GMDoppelGanger4.cpp:88-133).
 */
const KANTURU1: Partial<Record<number, MeshAnimation>> = {
  46: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.0015) * 0.8 + 1 },
  77: { mesh: 0, kind: 'blend', v: saw(10000, 0.0002) },
  102: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
};

/**
 * Kanturu Relics (GM_Kanturu_2nd.cpp:219-241): 10's clamped sine, 38's
 * sine, 42's diagonal scroll (no model for 42 in Object39 — kept to match
 * the source).
 */
const KANTURU2: Partial<Record<number, MeshAnimation>> = {
  10: {
    mesh: 0,
    kind: 'blend',
    light: t => Math.min(0.9, Math.max(0.1, Math.sin(t * 0.0015) + 1)),
  },
  38: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
  42: {
    mesh: 0,
    kind: 'blend',
    u: saw(10000, 0.0002),
    v: saw(10000, 0.0002),
  },
};

/**
 * Elbeland (GMNewTown.cpp:105-149): the river (2), ravine (53), channel
 * (55) and waterway (89) sheets scroll V up `0.015`/tick (89: `0.005`);
 * 56 is the Atlans-gate water's breathing glow.
 */
const ELBELAND: Partial<Record<number, MeshAnimation>> = {
  2: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  53: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  55: { mesh: 0, kind: 'blend', v: perTick(0.015) },
  56: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.003) * 0.3 + 0.5 },
  89: { mesh: 0, kind: 'blend', v: perTick(0.005) },
};

/** Raklion + hatchery (GM_Raklion.cpp:250-254) and Doppelganger 1 (:176-180): the ice crystal. */
const RAKLION: Partial<Record<number, MeshAnimation>> = {
  22: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) + 1 },
};

/** Doppelganger 3 (GMDoppelGanger3.cpp:75-93): the Atlans sines verbatim. */
const DOPPELGANGER3: Partial<Record<number, MeshAnimation>> = {
  23: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.002) * 0.3 + 0.5 },
  32: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  34: { mesh: 1, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.5 + 0.5 },
  40: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.004) * 0.3 + 0.5 },
};

/** Balgas Barracks / Refuge (GM3rdChangeUp.cpp:87-89): the lava sheet. */
const BALGAS: Partial<Record<number, MeshAnimation>> = {
  57: { mesh: 0, kind: 'blend', v: saw(10000, 0.0002) },
};

/**
 * Valley of Loren (GMBattleCastle.cpp:930-940): 81/83 force `BlendMesh = 1`
 * and scroll V unbounded (`WorldTime * 0.0002`, `-WorldTime * 0.0004`).
 */
const VALLEY_OF_LOREN: Partial<Record<number, MeshAnimation>> = {
  81: { mesh: 1, kind: 'blend', v: t => (t * 0.0002) % 1 },
  83: { mesh: 1, kind: 'blend', v: t => -((t * 0.0004) % 1) },
};

/** Illusion Temple (w_CursedTemple.cpp:337-341): the three breathing lamps. */
const CURSED_TEMPLE: Partial<Record<number, MeshAnimation>> = {
  64: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) * 0.5 + 0.5 },
  65: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) * 0.5 + 0.5 },
  80: { mesh: 0, kind: 'blend', light: t => Math.sin(t * 0.001) * 0.5 + 0.5 },
};

/** Fortress of Imperial Guardian (GMEmpireGuardian1.cpp:281-284 and copies): the rain sheet. */
const EMPIRE_GUARDIAN: Partial<Record<number, MeshAnimation>> = {
  81: { mesh: 0, kind: 'blend', v: perTick(0.015) },
};

const BY_WORLD: Partial<
  Record<ENUM_WORLD, Partial<Record<number, MeshAnimation>>>
> = {
  [ENUM_WORLD.WD_1DUNGEON]: DUNGEON,
  [ENUM_WORLD.WD_3NORIA]: NORIA,
  [ENUM_WORLD.WD_4LOSTTOWER]: LOST_TOWER,
  [ENUM_WORLD.WD_6STADIUM]: STADIUM,
  [ENUM_WORLD.WD_7ATLANSE]: ATLANS,
  [ENUM_WORLD.WD_8TARKAN]: TARKAN,
  [ENUM_WORLD.WD_30BATTLECASTLE]: VALLEY_OF_LOREN,
  [ENUM_WORLD.WD_33AIDA]: AIDA,
  [ENUM_WORLD.WD_37KANTURU_1ST]: KANTURU1,
  [ENUM_WORLD.WD_38KANTURU_2ND]: KANTURU2,
  [ENUM_WORLD.WD_40AREA_FOR_GM]: KANTURU1,
  [ENUM_WORLD.WD_41CHANGEUP3RD_1ST]: BALGAS,
  [ENUM_WORLD.WD_42CHANGEUP3RD_2ND]: BALGAS,
  ...onWorlds(CURSED_TEMPLE_WORLDS, CURSED_TEMPLE),
  [ENUM_WORLD.WD_51ELBELAND]: ELBELAND,
  [ENUM_WORLD.WD_57ICECITY]: RAKLION,
  [ENUM_WORLD.WD_58ICECITY_BOSS]: RAKLION,
  [ENUM_WORLD.WD_65DOPPLEGANGER1]: RAKLION,
  [ENUM_WORLD.WD_67DOPPLEGANGER3]: DOPPELGANGER3,
  [ENUM_WORLD.WD_68DOPPLEGANGER4]: KANTURU1,
  ...onWorlds(EMPIRE_GUARDIAN_WORLDS, EMPIRE_GUARDIAN),
};

export function meshAnimationFor(
  world: ENUM_WORLD,
  type: number
): MeshAnimation | undefined {
  return BY_WORLD[world]?.[type];
}
