import { Matrix, Vector3, type Scene, type Skeleton, type TransformNode } from '../render/babylon/exports';
import { PhysicsCloth, stepClothWind, type ClothAnchor, type ClothSpec } from './physicsCloth';
import { ClothMesh, pulseClothLights, type Rgb } from './clothMesh';

/** The original's 25 Hz frame: one `Move2` a tick. */
const TICK = 1 / 25;
/** At most this many ticks are caught up in one frame; a longer stall drops the rest. */
const MAX_TICKS = 3;
/** `Move2(0.005f, 5)`, or `Move2(0, 5)` stunned or asleep (ZzzCharacter.cpp:9963-9975). */
const STEP = 0.005;
const SUB_STEPS = 5;
const CM = 100;

/** What a set hangs on: a model object's root node and rig (`ModelObject` is one). */
export interface ClothBody {
  readonly node: TransformNode;
  readonly gltf: { readonly skeleton: Skeleton } | null;
}

const local = new Vector3();
const world = new Vector3();

type Worn = {
  readonly spec: ClothSpec;
  readonly cloth: PhysicsCloth;
  readonly mesh: ClothMesh;
  created: boolean;
  /** The anchor bone's world at the last tick, inverted; times the bone now, the carry until the next. */
  readonly sinceTick: Matrix;
  readonly carry: Matrix;
};

/**
 * One wearer's cloths (`o->m_pCloth`, `m_byNumCloth` of them), stepped on the original's 25 Hz tick and
 * drawn every frame. A slot keeps its cloth while `wear` names the same spec; a new spec builds a new
 * cloth on the next tick (`Create`), and a torn one drops them all (`DeleteCloth`).
 */
export class ClothSet implements ClothAnchor {
  windX = 0;
  windY = 1;
  /** Drawn and stepped: the body is on screen and not cloaked. Off, the cloths keep their last state. */
  shown = true;
  /** `Move2(0, 5)` under stun or sleep: the pins follow, nothing falls. */
  held = false;
  /** Whether the Classic shadow is drawn (RenderLinkObject's cloth case, ZzzCharacter.cpp:8433-8446). */
  castsShadow = false;

  private readonly slots: (Worn | null)[] = [];
  private light: Rgb = [1, 1, 1];
  /** This frame's bone world matrices by MU bone index. */
  private readonly bones: (Matrix | null)[] = [];
  private ready = false;
  private torn = false;

  constructor(
    readonly scene: Scene,
    private readonly body: ClothBody
  ) {}

  /** The specs to hang now, by slot (null leaves a slot empty), in `CloakLight`. */
  wear(specs: readonly (ClothSpec | null)[], light: Rgb): void {
    this.light = light;
    const n = Math.max(specs.length, this.slots.length);
    let any = false;
    for (let s = 0; s < n; s++) {
      const spec = specs[s] ?? null;
      let worn = this.slots[s] ?? null;
      if (worn?.spec !== spec) {
        worn?.mesh.dispose();
        worn = spec ? this.make(spec) : null;
        this.slots[s] = worn;
      }
      if (worn) {
        worn.mesh.setLight(light);
        any = true;
      }
    }
    if (any) activate(this);
    else deactivate(this);
  }

  /** `DeleteCloth`: every cloth goes; the next `wear` builds them anew. */
  drop(): void {
    for (let s = 0; s < this.slots.length; s++) {
      this.slots[s]?.mesh.dispose();
      this.slots[s] = null;
    }
    deactivate(this);
  }

  /** How many cloths hang (`m_byNumCloth`). */
  get size(): number {
    let n = 0;
    for (let s = 0; s < this.slots.length; s++) if (this.slots[s]) n++;
    return n;
  }

  /** The cloth in slot `s`, and its mesh. */
  cloth(s: number): PhysicsCloth | null {
    return this.slots[s]?.cloth ?? null;
  }

  mesh(s: number): ClothMesh | null {
    return this.slots[s]?.mesh ?? null;
  }

  dispose(): void {
    this.drop();
  }

  private make(spec: ClothSpec): Worn {
    return {
      spec,
      cloth: new PhysicsCloth(spec),
      mesh: new ClothMesh(this.scene, spec, this.light, this.body.node),
      created: false,
      sinceTick: new Matrix(),
      carry: new Matrix(),
    };
  }

  // ---- ClothAnchor, in MU world centimetres: MU (x, y, z) is (x, z, y) in the scene, in tiles.

  bonePoint(bone: number, x: number, y: number, z: number, out: Float64Array, at: number): void {
    local.set(x / CM, y / CM, z / CM);
    Vector3.TransformCoordinatesToRef(local, this.bones[bone] ?? this.body.node.getWorldMatrix(), world);
    out[at] = world.x * CM;
    out[at + 1] = world.z * CM;
    out[at + 2] = world.y * CM;
  }

  bodyPoint(bone: number, x: number, y: number, z: number, out: Float64Array, at: number): void {
    local.set(x / CM, z / CM, y / CM);
    Vector3.TransformNormalToRef(local, this.body.node.getWorldMatrix(), world);
    const m = (this.bones[bone] ?? this.body.node.getWorldMatrix()).m;
    out[at] = (world.x + m[12]) * CM;
    out[at + 1] = (world.z + m[14]) * CM;
    out[at + 2] = (world.y + m[13]) * CM;
  }

  /** This frame's bones and wind direction; hides the cloths while the rig is not in or the set is hidden. */
  begin(): void {
    const skeleton = this.body.gltf?.skeleton;
    this.ready = this.shown && !!skeleton;
    this.torn = false;
    if (!this.shown || !skeleton) {
      for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.setEnabled(false);
      return;
    }
    this.bones.fill(null);
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn) continue;
      const bones = anchorBones(worn.spec);
      for (let b = 0; b < bones.length; b++) {
        const bone = bones[b];
        if (!this.bones[bone]) this.bones[bone] = skeleton.bones[bone + 1]?.getTransformNode()?.getWorldMatrix() ?? null;
      }
    }
    // The body's back, its own (0, 1, 0): `(sin(180 + a), -cos(180 + a))` (PhysicsManager.cpp:609-610).
    local.set(0, 0, 1);
    Vector3.TransformNormalToRef(local, this.body.node.getWorldMatrix(), world);
    const length = Math.hypot(world.x, world.z) || 1;
    this.windX = world.x / length;
    this.windY = world.z / length;
  }

  /** One 25 Hz frame for every cloth; a torn one marks the set to drop. */
  tick(time: number, gusty: boolean): void {
    if (!this.ready || this.torn) return;
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn) continue;
      if (!worn.created) {
        worn.cloth.create(this);
        worn.created = true;
      }
      if (!worn.cloth.move2(this, this.held ? 0 : STEP, SUB_STEPS, time, gusty)) {
        this.torn = true;
        return;
      }
    }
  }

  /** The frame's draw: after a tick the new positions, between ticks the anchor bone's move since. */
  end(ticked: boolean): void {
    if (!this.ready) return;
    if (this.torn) {
      this.drop();
      return;
    }
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn || !worn.created) continue;
      const bone = this.bones[worn.spec.bone] ?? this.body.node.getWorldMatrix();
      if (ticked) {
        worn.mesh.write(worn.cloth.pos);
        bone.invertToRef(worn.sinceTick);
      }
      worn.sinceTick.multiplyToRef(bone, worn.carry);
      worn.mesh.setWorld(worn.carry);
      worn.mesh.setEnabled(true);
      worn.mesh.setShadow(this.castsShadow);
    }
  }
}

/** The bones a cloth reads: its pins' and its spheres', made once per spec. */
const boneLists = new WeakMap<ClothSpec, readonly number[]>();
function anchorBones(spec: ClothSpec): readonly number[] {
  let bones = boneLists.get(spec);
  if (!bones) {
    bones = [...new Set([spec.bone, ...(spec.spheres ?? []).map(s => s[4])])];
    boneLists.set(spec, bones);
  }
  return bones;
}

// ---- The clock: `CPhysicsManager::Move` and every wearer's `Move2`, once per 25 Hz tick.

const active: ClothSet[] = [];
const sets: ClothSet[] = [];
let observed: Scene | null = null;
let lastFrame = -1;
let debt = 0;
let clockMs = 0;
let gustyWorld = false;

function activate(set: ClothSet): void {
  if (active.includes(set)) return;
  active.push(set);
  const scene = set.scene;
  if (observed === scene) return;
  observed = scene;
  scene.onBeforeCameraRenderObservable.add(() => {
    // Once a frame, on the first camera: the render id has moved on, so the bones read this frame's clips.
    const frame = scene.getFrameId();
    if (frame === lastFrame) return;
    lastFrame = frame;
    runClothFrame();
  });
}

function deactivate(set: ClothSet): void {
  const i = active.indexOf(set);
  if (i >= 0) active.splice(i, 1);
}

/** The frame's time, from the world's systems; `gusty` is the login scene's wind (`WorldActive == 55`). */
export function advanceClothClock(dt: number, gusty: boolean): void {
  debt = Math.min(debt + dt, MAX_TICKS * TICK);
  clockMs += dt * 1000;
  gustyWorld = gusty;
}

/** The due ticks (the shared wind, then each wearer, as the original's frame), then every set's draw. */
export function runClothFrame(): void {
  const ticks = Math.floor(debt / TICK);
  debt -= ticks * TICK;
  // A copy: a torn set leaves `active` in `end`.
  sets.length = 0;
  for (let i = 0; i < active.length; i++) sets.push(active[i]);
  for (let i = 0; i < sets.length; i++) sets[i].begin();
  for (let t = 0; t < ticks; t++) {
    stepClothWind();
    for (let i = 0; i < sets.length; i++) sets[i].tick(clockMs, gustyWorld);
  }
  for (let i = 0; i < sets.length; i++) sets[i].end(ticks > 0);
  pulseClothLights(clockMs);
}
