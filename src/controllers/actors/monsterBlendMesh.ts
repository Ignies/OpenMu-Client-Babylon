import type { MeshAnimation } from '../render/meshAnimation';
import type { ModelObject } from '../render/modelObject';
import { MonsterActionType } from '@versions/shared/objects/enum';
import { monsterRegistry } from '../monsters';

/**
 * Monster additive body mesh by model type: `CreateMonster`
 * (ZzzCharacter.cpp:13786-14052) and `MoveCharacterVisual` (:6002-6080). See actors/readme.md.
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

/** A blend mesh drawn as its case leaves it: no per-tick write. */
const still = (mesh: number): MonsterBlendMesh => ({ mesh, light: 1 });

const MONSTER_BLEND_MESHES: Partial<Record<number, MonsterBlendMesh>> = {
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
  // Ice Queen 25: mesh 2 (:14000); Beetle Monster 28: mesh 1 (:13981).
  18: still(2),
  21: still(1),
  // Tantallos 58, Zaikan 59, Golden Tantallos 82: mesh 2 (:13741, :13546).
  42: still(2),
  // Alquamos 69: mesh 0 (:13576).
  50: still(0),
  // Every Crust (Mega 71, Alpha 74, Omega Wing 301, Golden 496): mesh 1 (:13607, :14902), U scrolling a
  // full sheet every 2.5 s (:5818).
  52: { mesh: 1, light: 1, animate: () => ({ mesh: 1, kind: 'blend', u: saw(10000, 0.0004) }) },
  // The Kalima line (GMHellas.cpp:780-878): the Aegis 66 and the Death and Rogue Centurions 67. The Death
  // Angel's mesh 1 and the Necron's mesh 3 (and their breathing, :1428-1452) name meshes their bodies lack.
  66: still(1),
  67: still(0),
  // Life Stone 278: mesh 3 (GMBattleCastle.cpp:1409).
  86: still(3),
};

/** The parts of a model a type's own look writes before `load()`. */
type LookTarget = Pick<ModelObject, 'MeshPasses' | 'FixedLight' | 'Light'>;

/**
 * A type's own `RenderMonster` look (its folder's `passes` and `bodyLight`): the passes unless the class set its
 * own, and the light its case sets, held there instead of the floor's (renderSystem reads `FixedLight`).
 */
export function applyMonsterLook(model: LookTarget, npcType: number | undefined): void {
  const def = npcType === undefined ? undefined : monsterRegistry.def(npcType);
  if (def?.passes && !model.MeshPasses) model.MeshPasses = def.passes;
  if (def?.bodyLight) {
    model.FixedLight = true;
    model.Light.set(def.bodyLight[0], def.bodyLight[1], def.bodyLight[2]);
  }
}

/** A dying type's `o->BlendMesh = -2` (its folder's `dyingBlendAll`): true once it turned the model all additive. */
export function dyingBlend(model: Pick<ModelObject, 'blendAll'>, npcType: number | undefined, dying: boolean): boolean {
  if (!dying || npcType === undefined) return false;
  const when = monsterRegistry.def(npcType)?.dyingBlendAll;
  if (!when || !when()) return false;
  model.blendAll();
  return true;
}

/** A type's own blend mesh (its folder's `blendMesh`), else its body's. */
export function blendMeshOf(npcType: number | undefined, modelType: number): MonsterBlendMesh | undefined {
  const own = npcType === undefined ? undefined : monsterRegistry.def(npcType)?.blendMesh;
  return own ? { mesh: own.mesh, light: own.light ?? 1 } : monsterBlendMeshFor(modelType);
}

/** The blend mesh this monster model carries, if any. */
export function monsterBlendMeshFor(
  modelType: number
): MonsterBlendMesh | undefined {
  return MONSTER_BLEND_MESHES[modelType];
}
