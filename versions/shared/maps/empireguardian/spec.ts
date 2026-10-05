import type { Emission } from '@/controllers/fx/effectParticles';
import type { LightEmitter } from '@/controllers/lighting/mapObjectLights';
import type { MeshAnimations } from '@/controllers/render';
import { perTick } from '../shared/meshAnimation';
import { EMPIRE_GUARDIAN_4_LIGHTS } from '../empireguardian4/spec';

/**
 * Fortress of Imperial Guardian, days 1-4 (`WD_69EMPIREGUARDIAN1 …
 * WD_72EMPIREGUARDIAN4`, `World70…73` / `Object70…73`), the plain-data half.
 * Nothing here may import the scene.
 *
 * Four folders, one art set (Object70/71/72 are 127 models each, Object73
 * the same list) and four copies of one `MoveObject`
 * (GMEmpireGuardian1.cpp:215-294, 2.cpp:116-196, 3.cpp:110-190,
 * 4.cpp:150-241) that differ in one constant - 64's `Velocity` is 0.44 on
 * day 3, 0.64 on the others. EncTerrain70-73.obj: 836 / 729 / 748 / 1670
 * objects.
 *
 * Days 1-3 only. Day 4 owns its own tables in `versions/shared/maps/empireguardian4/spec.ts`
 * and the login scenes theirs in `versions/shared/maps/loginscene/spec.ts`; the three used to
 * be one set here, on the reading that day 4 *was* the login scene, which is
 * also where the 628 in the object counts above came from - that is
 * World78's total, not World73's.
 */

/** No `o->BlendMesh` writes; 81's V scroll (`+0.015`/tick) is in the `render.meshAnimations` rows. */
export const EMPIRE_GUARDIAN_BLEND_MESHES: Readonly<Record<number, number>> = {};

/**
 * `MoveObject`: 79, 80, 82-86, 129-132 hidden - the torches, rain sheets and
 * fog banks the login scene already drives (79 fire, 82 water, 86/129-131
 * cloud, 132 smoke). Same list as `EMPIRE_GUARDIAN_4_EFFECT_TYPES`.
 */
export const EMPIRE_GUARDIAN_EFFECT_ONLY_TYPES: readonly number[] = [
  79, 80, 82, 83, 84, 85, 86, 129, 130, 131, 132,
];

/** The login scene's rows, restated so days 1-3 match day 4. */
export const EMPIRE_GUARDIAN_EMISSIONS: Partial<
  Record<number, readonly Emission[]>
> = {
  79: [
    { kinds: ['fire1', 'fire2', 'fire3'], every: 1, count: 3, light: [1, 1, 1] },
  ],
  82: [{ kinds: ['waterfall5_9'], every: 1 }],
  86: [{ kinds: ['cloud21'], every: 6, light: [0.05, 0.02, 0.01] }],
  129: [{ kinds: ['cloud21'], every: 6, light: [0.01, 0.02, 0.05] }],
  130: [{ kinds: ['cloud21'], every: 6, light: [0.01, 0.05, 0.02] }],
  131: [
    { kinds: ['smoke22'], every: 3 },
    { kinds: ['smoke21'], every: 3, scale: 2 },
  ],
  132: [
    { kinds: ['smoke60'], every: 3, count: 2 },
    { kinds: ['smoke21'], every: 3, scale: 2 },
  ],
};

/**
 * The 79 torch, as the login scene lights it, and day 4's 80, the blue lamp:
 * each day's case 80 is day 4's (GMEmpireGuardian1.cpp:1713-1721,
 * 2.cpp:698-706, 3.cpp:887-895), placed once on day 2 and six times on day 3.
 * 37, the wall torch, is a class (`create.ts`).
 */
export const EMPIRE_GUARDIAN_LIGHTS: Partial<
  Record<number, readonly LightEmitter[]>
> = {
  79: [
    {
      sprite: { scale: 2, color: [1, 0.2, 0] },
      pointRange: 6,
      terrain: {
        range: 3,
        color: [1, 0.6, 0.2],
        flicker: { min: 0.5, max: 1, steps: 4 },
      },
    },
  ],
  80: EMPIRE_GUARDIAN_4_LIGHTS[80],
};

/** Fortress of Imperial Guardian (GMEmpireGuardian1.cpp:281-284 and copies): the rain sheet. */
export const EMPIREGUARDIAN_MESH_ANIMATIONS: MeshAnimations = {
  81: { mesh: 0, kind: 'blend', v: perTick(0.015) },
};
