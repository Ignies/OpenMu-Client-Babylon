import { Matrix, Mesh, Vector3, type AbstractMesh, type Scene, type Skeleton, type TransformNode } from '../render/babylon/exports';
import { isGridSpec, PhysicsCloth, stepClothWind, type AnyClothSpec, type ClothAnchor } from './physicsCloth';
import { ClothMesh, pulseClothLights, type Rgb } from './clothMesh';
import { ClothSkin } from './clothSkin';
import { isOn } from '../fidelity';

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
  /** `Models[iBMDType].Meshs[i]`: the model whose meshes a mesh cloth is made of (`ModelObject.getMesh`). */
  getMesh?(index: number): AbstractMesh | undefined;
}

const local = new Vector3();
const world = new Vector3();

/** How a cloth is drawn: its own faces (`ClothMesh`) or the model's mesh (`ClothSkin`). */
interface ClothDraw {
  write(pos: Float64Array, toBone: Matrix): void;
  setWorld(world: Matrix): void;
  setLight(light: Rgb): void;
  show(faces: boolean, shadow: boolean): void;
  dispose(): void;
}

type Worn = {
  readonly spec: AnyClothSpec;
  readonly cloth: PhysicsCloth;
  readonly mesh: ClothDraw;
  /** The bones it reads: its pins', its spheres' and, on a mesh, every vertex's. */
  readonly bones: readonly number[];
  created: boolean;
  /** `Move2` calls this frame: the original's loops that reached it (0 is neither stepped nor drawn). */
  draws: number;
  /** Whether stun or sleep holds it (`Move2(0, 5)`); some callers never pass the hold. */
  holds: boolean;
  /** The anchor bone's world at the last tick, inverted; times the bone now, the carry until the next. */
  readonly sinceTick: Matrix;
  readonly carry: Matrix;
};

const IDENTITY = Matrix.Identity();

/** Whether a built cloth the frame does not draw still lays its shadow: Classic; `drawnClothShadows` leaves it out. */
let strayShadows = true;

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
  /** The body fades out dead: `DeadCharacter`'s `DeleteCloth` every 25 Hz frame, so each tick lays every cloth anew. */
  fading = false;
  /** Whether the Classic shadow is drawn (RenderLinkObject's cloth case, ZzzCharacter.cpp:8433-8446). */
  castsShadow = false;
  /** `m_byNumCloth`: the slots the loop walks and the shadow lays. */
  count = 0;
  /** `m_pCloth != NULL`: built, until `drop`. */
  built = false;
  /** The set that goes with this one: `DeleteCloth` takes a body's cloths and its parts' together (ZzzCharacter.cpp:3070-3115). */
  partner: ClothSet | null = null;

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

  /**
   * `pCloth[slot].Create`: a new cloth from `spec`, laid on the body on the next tick. A cloth of the model's
   * mesh (`spec.mesh`) waits for the mesh: none is built while the body has not got it.
   */
  build(slot: number, spec: AnyClothSpec): void {
    const worn = this.make(spec);
    if (!worn) return;
    this.slots[slot]?.mesh.dispose();
    this.slots[slot] = worn;
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

  /** Steps and draws `slot` this frame, once a call (`Move2`); `holds` false steps it under stun or sleep too. */
  draw(slot: number, holds = true): void {
    const worn = this.slots[slot];
    if (!worn) return;
    worn.draws++;
    worn.holds = holds;
  }

  /** Forgets the frame's draws: the wearer's rule names them anew each frame. */
  undraw(): void {
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (worn) worn.draws = 0;
    }
  }

  /** `CloakLight`: white, or the duel / soccer team colour (ZzzCharacter.cpp:9188-9246). */
  setLight(light: Rgb): void {
    if (light[0] === this.light[0] && light[1] === this.light[1] && light[2] === this.light[2]) return;
    this.light = light;
    for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.setLight(light);
  }

  /** `DeleteCloth`: every cloth goes, the partner's too; the wearers' rule builds them anew. */
  drop(): void {
    this.clear();
    this.partner?.clear();
  }

  private clear(): void {
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
    const mesh = this.slots[s]?.mesh;
    return mesh instanceof ClothMesh ? mesh : null;
  }

  /** How many times slot `s` is stepped this frame. */
  draws(s: number): number {
    return this.slots[s]?.draws ?? 0;
  }

  drawn(s: number): boolean {
    return this.draws(s) > 0;
  }

  dispose(): void {
    this.drop();
  }

  private make(spec: AnyClothSpec): Worn | null {
    let mesh: ClothDraw;
    let cloth: PhysicsCloth;
    let bones = anchorBones(spec);
    if (isGridSpec(spec) && spec.mesh === undefined) {
      cloth = new PhysicsCloth(spec);
      mesh = new ClothMesh(this.scene, spec, this.light, this.body.node);
    } else {
      const target = this.body.getMesh?.(spec.mesh as number);
      if (!(target instanceof Mesh)) return null;
      const skin = new ClothSkin(target, spec);
      cloth = new PhysicsCloth(spec, skin.shape);
      if (skin.shape) bones = [...new Set([...bones, ...skin.shape.nodes])];
      mesh = skin;
    }
    return { spec, cloth, mesh, bones, created: false, draws: 0, holds: true, sinceTick: new Matrix(), carry: new Matrix() };
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

  /**
   * This frame's bones and wind direction; hides everything while the rig is not in or the set is hidden. A mesh
   * the model let go (a new part) takes the set with it (`DeleteCloth`), which the wearer's rule builds anew.
   */
  begin(): void {
    const skeleton = this.body.gltf?.skeleton;
    this.ready = this.shown && !!skeleton;
    this.torn = false;
    for (let s = 0; s < this.slots.length; s++) {
      const mesh = this.slots[s]?.mesh;
      if (mesh instanceof ClothSkin && mesh.stale) {
        this.ready = false;
        this.drop();
        return;
      }
    }
    if (!this.shown || !skeleton) {
      for (let s = 0; s < this.slots.length; s++) this.slots[s]?.mesh.show(false, false);
      return;
    }
    this.bones.fill(null);
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn) continue;
      const bones = worn.bones;
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

  /**
   * One 25 Hz frame: each new cloth laid on the body (`Create`), the drawn ones stepped; a torn one drops the set.
   * Fading, every cloth is new each tick: deleted and built again as the wearer's rule builds it (ZzzCharacter.cpp:3251).
   */
  tick(time: number, gusty: boolean): void {
    if (!this.ready || this.torn) return;
    for (let s = 0; s < this.slots.length; s++) {
      const worn = this.slots[s];
      if (!worn) continue;
      if (this.fading) worn.created = false;
      if (!worn.created) {
        worn.cloth.create(this);
        worn.created = true;
        // Built but not drawn: it lies where Create laid it.
        if (worn.draws === 0) {
          this.boneOf(worn).invertToRef(worn.sinceTick);
          worn.mesh.write(worn.cloth.pos, worn.sinceTick);
        }
      }
      const step = this.held && worn.holds ? 0 : STEP;
      for (let n = 0; n < worn.draws; n++) {
        if (!worn.cloth.move2(this, step, SUB_STEPS, time, gusty)) {
          this.torn = true;
          return;
        }
      }
    }
  }

  /** The cloth's anchor bone this frame, or the body when the rig has none. */
  private boneOf(worn: Worn): Matrix {
    return this.bones[worn.spec.bone] ?? this.body.node.getWorldMatrix();
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
      if (worn.draws === 0) {
        // Not stepped: its last positions stay where they were left, and on Classic its shadow with them.
        const stray = laid && strayShadows;
        worn.mesh.show(false, stray);
        if (stray) worn.mesh.setWorld(IDENTITY);
        continue;
      }
      const bone = this.boneOf(worn);
      if (ticked) {
        bone.invertToRef(worn.sinceTick);
        worn.mesh.write(worn.cloth.pos, worn.sinceTick);
      }
      worn.sinceTick.multiplyToRef(bone, worn.carry);
      worn.mesh.show(true, laid);
      worn.mesh.setWorld(worn.carry);
    }
  }
}

/** The bones a cloth reads: its pins' and its spheres', made once per spec. */
const boneLists = new WeakMap<AnyClothSpec, readonly number[]>();
function anchorBones(spec: AnyClothSpec): readonly number[] {
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
  strayShadows = !isOn('drawnClothShadows');
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
