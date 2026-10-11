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
  /** Stepped and drawn this frame: the original's loop reached its `Move2` and `Render`. */
  drawn: boolean;
  /** The anchor bone's world at the last tick, inverted; times the bone now, the carry until the next. */
  readonly sinceTick: Matrix;
  readonly carry: Matrix;
};

const IDENTITY = Matrix.Identity();

/**
 * One wearer's cloths (`o->m_pCloth`), stepped on the original's 25 Hz tick and drawn every frame. The
 * wearer's rule builds and destroys cloths by slot (`Create`, `Destroy`), sets `count` (`m_byNumCloth`)
 * and names each frame the slots it draws; a torn cloth drops them all (`DeleteCloth`). Every built cloth
 * below `count` lays the Classic shadow, the ones not drawn where they were left (ZzzBMD.cpp:2648-2710).
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
  /** `m_byNumCloth`: the slots the loop walks and the shadow lays. */
  count = 0;
  /** `m_pCloth != NULL`: built, until `drop`. */
  built = false;

  private readonly slots: (Worn | null)[] = [];
  private light: Rgb = [1, 1, 1];
  /** This frame's bone world matrices by MU bone index. */
  private readonly bones: (Matrix | null)[] = [];
  private ready = false;
  private torn = false;
  /** In the clock's list. */
  listed = false;

  constructor(
    readonly scene: Scene,
    private readonly body: ClothBody
  ) {}

  /** `pCloth[slot].Create`: a new cloth from `spec`, laid on the body on the next tick. */
  build(slot: number, spec: ClothSpec): void {
    this.slots[slot]?.mesh.dispose();
    this.slots[slot] = this.make(spec);
    this.built = true;
    activate(this);
  }

  /** `pCloth[slot].Destroy`. */
  destroy(slot: number): void {
    this.slots[slot]?.mesh.dispose();
    this.slots[slot] = null;
  }

  /** `pCloth[slot].GetOwner() != NULL`. */
  has(slot: number): boolean {
    return !!this.slots[slot];
  }

  /** Steps and draws `slot` this frame. */
  draw(slot: number): void {
    const worn = this.slots[slot];
    if (worn) worn.drawn = true;
  }

  /** Forgets the frame's draws: the wearer's rule names them anew each frame. */
  undraw(): void {
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (worn) worn.drawn = false;
    }
  }

  /** `CloakLight`: white, or the duel / soccer team colour (ZzzCharacter.cpp:9188-9246). */
  setLight(light: Rgb): void {
    if (light[0] === this.light[0] && light[1] === this.light[1] && light[2] === this.light[2]) return;
    this.light = light;
    for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.setLight(light);
  }

  /** `DeleteCloth`: every cloth goes; the wearer's rule builds the set anew. */
  drop(): void {
    for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.dispose();
    this.slots.length = 0;
    this.built = false;
    this.count = 0;
    deactivate(this);
  }

  /** How many cloths are built. */
  get size(): number {
    let n = 0;
    for (let s = 0; s < this.slots.length; s++) if (this.slots[s]) n++;
    return n;
  }

  /** The cloth in slot `s`, its mesh, and whether it is drawn this frame. */
  cloth(s: number): PhysicsCloth | null {
    return this.slots[s]?.cloth ?? null;
  }

  mesh(s: number): ClothMesh | null {
    return this.slots[s]?.mesh ?? null;
  }

  drawn(s: number): boolean {
    return !!this.slots[s]?.drawn;
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
      drawn: false,
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

  /** This frame's bones and wind direction; hides everything while the rig is not in or the set is hidden. */
  begin(): void {
    const skeleton = this.body.gltf?.skeleton;
    this.ready = this.shown && !!skeleton;
    this.torn = false;
    if (!this.shown || !skeleton) {
      for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.show(false, false);
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

  /** One 25 Hz frame: each new cloth laid on the body (`Create`), the drawn ones stepped; a torn one drops the set. */
  tick(time: number, gusty: boolean): void {
    if (!this.ready || this.torn) return;
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn) continue;
      if (!worn.created) {
        worn.cloth.create(this);
        worn.created = true;
        // Built but not drawn: it lies where Create laid it.
        if (!worn.drawn) worn.mesh.write(worn.cloth.pos);
      }
      if (!worn.drawn) continue;
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
      const laid = this.castsShadow && s < this.count;
      if (!worn.drawn) {
        // Not stepped: its last positions stay where they were left, and its shadow with them.
        worn.mesh.show(false, laid);
        if (laid) worn.mesh.setWorld(IDENTITY);
        continue;
      }
      const bone = this.bones[worn.spec.bone] ?? this.body.node.getWorldMatrix();
      if (ticked) {
        worn.mesh.write(worn.cloth.pos);
        bone.invertToRef(worn.sinceTick);
      }
      worn.sinceTick.multiplyToRef(bone, worn.carry);
      worn.mesh.show(true, laid);
      worn.mesh.setWorld(worn.carry);
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
  if (set.listed) return;
  set.listed = true;
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
  if (!set.listed) return;
  set.listed = false;
  active.splice(active.indexOf(set), 1);
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
  pulseClothLights(clockMs);
  for (let i = 0; i < sets.length; i++) sets[i].end(ticks > 0);
}
