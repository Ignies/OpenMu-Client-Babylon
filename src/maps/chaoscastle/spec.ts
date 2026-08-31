import type { Emission } from '../../common/effectParticles';

/**
 * Chaos Castle (worlds 18-23 + 53, all on `World19` / `Object19`), the
 * plain-data half. Nothing in here may import the scene: the shared registries
 * (`blendMeshes`, `effectOnlyObjects`, `effectParticles`) pull these tables
 * in, and every one of them is imported *by* `modelObject`/`mapTileObject`.
 *
 * EncTerrain19.obj: 194 objects, 33 types, every one at scale 1, the arena a
 * 22x34-tile floor at x 23-44, y 75-108 (the `TW_SAFEZONE` rectangle) hanging
 * in a black void (`SetWorldClearColor`, SceneManager.cpp:346). Types by role,
 * from `CSChaosCastle.cpp`:
 *  - **0-5, 13-17**: the outer ring — floor slabs and rim (the ones at z 0),
 *    with 0/1 their underside girders at z -785/-795. Stand until arena
 *    stage 1, then drop away.
 *  - **30-35**: the second rim, hidden at load and shown for stages 1-2, drop
 *    at stage 2. **24-29**: the third, shown for stages 2-3, drop at stage 3.
 *    **18-21**: the innermost, shown from stage 3. Each ring comes with its
 *    girders at z ~ -780 (22/23, 28/29, 34/35 pair with the slabs above them).
 *  - **6-12**: `RenderChaosCastleVisual` types that puff a handful of `CLOUD`
 *    particles on their first frame and hide themselves (`HiddenMesh = -2`)
 *    — smoke-box markers, never drawn.
 *  - **0-3 with `PKKey`**: the four lightning pillars; a `CreateJoint` thunder
 *    ribbon and `SOUND_CHAOS_THUNDER01/02` when the server flags one. No
 *    ribbon primitive in the clone (see Icarus), not reproduced.
 */

/** `CreateObject` has no Chaos Castle blend meshes; "checked, none". */
export const CHAOS_CASTLE_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * Types 6-12 (`RenderChaosCastleVisual`, CSChaosCastle.cpp:375-470): each
 * spawns 5-10 `BITMAP_CLOUD` particles once — dim `(0.05, 0.05, 0.1)` puffs,
 * one per object lifetime — and sets `HiddenMesh = -2`. A single puff at load
 * is not worth an emitter, so they are plain markers here.
 */
export const CHAOS_CASTLE_EFFECT_ONLY_TYPES: readonly number[] = [
  6, 7, 8, 9, 10, 11, 12,
];

/** Nothing on this map emits continuously; the ring-drop smoke is the arena's. */
export const CHAOS_CASTLE_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {};

/** A tile rectangle, `AddTerrainAttributeRange(x, y, w, h, …)` order. */
export type TileRect = readonly [x: number, y: number, w: number, h: number];

/**
 * One arena stage: the group that falls, the group that becomes the new rim,
 * and the `TW_NOGROUND` strips the server's state adds
 * (`CNewChaosCastleSystem::SetMatchGameCommand`, NewChaosCastleSystem.cpp:
 * 83-119, states 8/9/10). The `falls` groups are `MoveChaosCastleAllObject`'s
 * three cases (CSChaosCastle.cpp:226-338), `shows` the `HiddenMesh` cases of
 * `RenderChaosCastleVisual` (:474-516).
 */
export type ArenaStage = {
  readonly falls: readonly number[];
  readonly shows: readonly number[];
  readonly noGround: readonly TileRect[];
};

/** The outer ring, standing at load and the first to go. */
export const CHAOS_CASTLE_OUTER_RING: readonly number[] = [
  0, 1, 2, 3, 4, 5, 13, 14, 15, 16, 17,
];

/** Rings hidden at load: shown by a stage, dropped by the next. */
export const CHAOS_CASTLE_HIDDEN_RINGS: readonly number[] = [
  18, 19, 20, 21, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
];

/** States 8, 9, 10 of the `BloodCastleState` packet, in order. */
export const CHAOS_CASTLE_STAGES: readonly ArenaStage[] = [
  {
    falls: CHAOS_CASTLE_OUTER_RING,
    shows: [30, 31, 32, 33, 34, 35],
    noGround: [
      [23, 75, 22, 2],
      [43, 77, 2, 32],
      [23, 107, 20, 2],
      [23, 77, 2, 30],
    ],
  },
  {
    falls: [30, 31, 32, 33, 34, 35],
    shows: [24, 25, 26, 27, 28, 29],
    noGround: [
      [25, 77, 18, 2],
      [41, 79, 2, 28],
      [25, 105, 16, 2],
      [25, 79, 2, 26],
    ],
  },
  {
    falls: [24, 25, 26, 27, 28, 29],
    shows: [18, 19, 20, 21],
    noGround: [
      [27, 79, 14, 2],
      [39, 81, 2, 24],
      [27, 103, 12, 2],
      [27, 81, 2, 22],
    ],
  },
];

/** `BloodCastleState.State` values that advance the arena (chaosCastle.ts). */
export const CHAOS_CASTLE_STAGE_STATES: readonly number[] = [8, 9, 10];
