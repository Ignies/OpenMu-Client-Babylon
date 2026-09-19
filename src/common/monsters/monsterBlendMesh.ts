import type { MeshAnimation } from '../meshAnimation';
import { MonsterActionType } from '../objects/enum';

/**
 * The additive body mesh some monsters carry and what the original writes
 * on it every tick: `o->BlendMesh` / `o->BlendMeshLight` from `CreateMonster`
 * (ZzzCharacter.cpp:13786-14052) and the per-frame `BlendMeshTexCoordV` /
 * `BlendMeshLight` writes of `MoveCharacterVisual` (:6002-6080).
 *
 * Keyed by monster model type (`MONSTER_MODEL_*`). `MonsterObject.load`
 * applies the mesh and binds the animation through the same
 * `bindMeshAnimation` the map props use.
 *
 * Not here, because the original never gives them a blend mesh: the
 * `BlendMeshTexCoord` writes on Crust (:5818), Balrog (:6012) and Devil
 * (:6015) land on `BlendMesh = -1` and draw nothing (`RenderMeshAlternative`
 * scrolls only `i == BlendMesh || i == streamMesh`, ZzzBMD.cpp:1847). The
 * Dark Phoenix shield is its own object and has no model here.
 */

/** One original tick, in ms: the writes step at 25 Hz. */
const TICK_MS = 40;

/** `WorldTime` runs in ms; `-(t % period) * rate` is the original's saw. */
const saw = (period: number, rate: number) => (t: number) =>
  -((t % period) * rate);

/** A value re-rolled once an original tick, held between ticks. */
function perTick(
  roll: (last: number) => number,
  initial: number
): (t: number) => number {
  let tick = -1;
  let value = initial;
  return t => {
    const k = Math.floor(t / TICK_MS);
    if (k !== tick) {
      tick = k;
      value = roll(value);
    }
    return value;
  };
}

export type MonsterBlendMesh = {
  /** `c->Object.BlendMesh`. */
  readonly mesh: number;
  /** `c->Object.BlendMeshLight` at creation. */
  readonly light: number;
  /** The per-tick writes, built per instance (some carry state). */
  readonly animate?: (model: { CurrentAction: number }) => MeshAnimation;
};

const MONSTER_MODEL_GORGON = 11;
const MONSTER_MODEL_ICE_MONSTER = 15;
const MONSTER_MODEL_DEATH_KNIGHT = 29;
const MONSTER_MODEL_HYDRA = 37;

export const MONSTER_BLEND_MESHES: Partial<Record<number, MonsterBlendMesh>> = {
  // Gorgon 18 / Death Gorgon 35: mesh 1 (:14051, :13903), and every tick
  // `BlendMeshLight = (rand() % 10) * 0.1f` (:6061) - the flicker.
  [MONSTER_MODEL_GORGON]: {
    mesh: 1,
    light: 1,
    animate: () => ({
      mesh: 1,
      kind: 'blend',
      light: perTick(() => Math.floor(Math.random() * 10) * 0.1, 1),
    }),
  },
  // Ice Monster 22: mesh 0 (:14023), V scrolling a full texture every 2 s (:6078).
  [MONSTER_MODEL_ICE_MONSTER]: {
    mesh: 0,
    light: 1,
    animate: () => ({ mesh: 0, kind: 'blend', v: saw(2000, 0.0005) }),
  },
  // Death Knight 40: `o->BlendMesh = 3` written every tick (:6003), V
  // scrolling a full texture every second (:6004).
  [MONSTER_MODEL_DEATH_KNIGHT]: {
    mesh: 3,
    light: 1,
    animate: () => ({ mesh: 3, kind: 'blend', v: saw(1000, 0.001) }),
  },
  // Hydra 49: mesh 5 from dark (:13789-13790); `BlendMeshLight` climbs 0.1 a
  // tick through Attack1 / Attack2 and falls 0.1 a tick after (:5988-6000).
  [MONSTER_MODEL_HYDRA]: {
    mesh: 5,
    light: 0,
    animate: model => ({
      mesh: 5,
      kind: 'blend',
      light: perTick(last => {
        const attacking =
          model.CurrentAction === MonsterActionType.Attack1 ||
          model.CurrentAction === MonsterActionType.Attack2;
        return Math.max(0, Math.min(1, last + (attacking ? 0.1 : -0.1)));
      }, 0),
    }),
  },
};

/** The blend mesh this monster model carries, if any. */
export function monsterBlendMeshFor(
  modelType: number
): MonsterBlendMesh | undefined {
  return MONSTER_BLEND_MESHES[modelType];
}
