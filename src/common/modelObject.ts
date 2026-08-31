import { assetWorldNum } from './worldAssets';
import {
  Matrix,
  Quaternion,
  Vector3,
  BoundingBox,
  BoundingInfo,
  Mesh,
  type StandardMaterial,
  TransformNode,
  type Scene,
  AbstractMesh,
  Skeleton,
  AnimationGroup,
  CreateBox,
  type Plane,
} from '../libs/babylon/exports';
import type { IVector3Like } from '../libs/babylon/exports';
import { PLAY_SPEED_TO_RATIO } from './playSpeed';

/** Rotation half of C⁻¹, the inverse of the model-root basis change applied in load(). */
const DEFAULT_BONE_LINK_ROTATION = Quaternion.FromEulerAngles(
  Math.PI * 1.5,
  0,
  0
);
import {
  SHADOW_SLOTS,
  createObjectShadow,
  blobShadowsActive,
  shadowStateVersion,
} from './objectShadow';
import type { Entity, World } from '../ecs/world';
import { ENUM_WORLD } from './types';
import {
  getFlatLitVariant,
  getMaterial,
  getScrollVariant,
  loadGLTF,
} from './modelLoader';
import { NO_BLEND_MESH } from './blendMeshes';
import { meshAnimationFor, type MeshAnimation } from './meshAnimation';
import { BlendState } from './objects/enum';
// Late-bound: a value import of `../store` closed an import cycle back to
// the monster classes that extend this one (B14, see `storeRef.ts`).
import { storeRef } from './storeRef';
import { requestGlowProbe } from '../scenes/sceneLook';
import type { MapObjectLights } from './mapObjectLights';

const BoundingUpdateInterval = 5;

type Int = number;

const EmptyBone = Matrix.Identity();
const EmptyMatrix = Matrix.Identity();
const tmpMatrix = Matrix.Identity();
const tmpQ = Quaternion.Identity();
const tmpVec3 = Vector3.Zero();
const tmpVec32 = Vector3.Zero();

const minTmp = new Vector3(Number.MAX_VALUE);
const maxTmp = new Vector3(Number.MIN_VALUE);

const boneWorldTmp = Matrix.Identity();

/**
 * Cache key for anything derived purely from a mesh's vertex data. Every
 * instance of a model is a clone sharing one `Geometry` (modelLoader's
 * container cache), so keying on the geometry means the 40 grass tufts in a
 * field compute this once between them instead of 40 times.
 */
function vertexDataKey(mesh: AbstractMesh): object {
  return (mesh as Mesh).geometry ?? mesh;
}

/** @see boneLocalBounds — keyed by shared geometry, not by mesh. */
const boneBoundsCache = new WeakMap<object, Float32Array | null>();

/**
 * Per-bone AABB of the vertices each bone drives, in the mesh's vertex space
 * (6 floats per bone, min xyz / max xyz; +Inf min marks an unused bone).
 * The BMD→GLB converter stores vertices relative to their bone, so the
 * unskinned bounding box collapses near the origin; this table, transformed by
 * the skeleton's current bone matrices, gives the posed bounds without
 * re-skinning the vertices on the CPU. Computed once per *geometry*.
 */
function boneLocalBounds(
  mesh: AbstractMesh,
  boneCount: number
): Float32Array | null {
  const key = vertexDataKey(mesh);
  const cached = boneBoundsCache.get(key);
  if (cached !== undefined) return cached;

  const positions = mesh.getVerticesData('position');
  const indices = mesh.getVerticesData('matricesIndices');
  const weights = mesh.getVerticesData('matricesWeights');
  if (!positions || !indices) {
    boneBoundsCache.set(key, null);
    return null;
  }

  const bounds = new Float32Array(boneCount * 6);
  for (let b = 0; b < boneCount; b++) {
    bounds.fill(Number.POSITIVE_INFINITY, b * 6, b * 6 + 3);
    bounds.fill(Number.NEGATIVE_INFINITY, b * 6 + 3, b * 6 + 6);
  }

  const vertexCount = positions.length / 3;
  for (let v = 0; v < vertexCount; v++) {
    // Dominant influence (the loader sets numBoneInfluencers = 1 anyway).
    let bone = indices[v * 4];
    if (weights) {
      let best = weights[v * 4];
      for (let k = 1; k < 4; k++) {
        if (weights[v * 4 + k] > best) {
          best = weights[v * 4 + k];
          bone = indices[v * 4 + k];
        }
      }
    }
    if (bone < 0 || bone >= boneCount) continue;

    const o = bone * 6;
    const x = positions[v * 3];
    const y = positions[v * 3 + 1];
    const z = positions[v * 3 + 2];
    if (x < bounds[o]) bounds[o] = x;
    if (y < bounds[o + 1]) bounds[o + 1] = y;
    if (z < bounds[o + 2]) bounds[o + 2] = z;
    if (x > bounds[o + 3]) bounds[o + 3] = x;
    if (y > bounds[o + 4]) bounds[o + 4] = y;
    if (z > bounds[o + 5]) bounds[o + 5] = z;
  }

  boneBoundsCache.set(key, bounds);
  return bounds;
}

/** Extends min/max by the posed world bounds of a skinned mesh; false if not possible. */
function extendBySkinnedBounds(
  mesh: AbstractMesh,
  min: Vector3,
  max: Vector3
): boolean {
  const skeleton = mesh.skeleton;
  if (!skeleton) return false;

  const boneCount = skeleton.bones.length;
  const bounds = boneLocalBounds(mesh, boneCount);
  const matrices = skeleton.getTransformMatrices(mesh);
  if (!bounds || !matrices || matrices.length < boneCount * 16) return false;

  const world = mesh.getWorldMatrix();

  for (let b = 0; b < boneCount; b++) {
    const o = b * 6;
    if (bounds[o] === Number.POSITIVE_INFINITY) continue;

    Matrix.FromArrayToRef(matrices, b * 16, tmpMatrix);
    tmpMatrix.multiplyToRef(world, boneWorldTmp);

    for (let corner = 0; corner < 8; corner++) {
      Vector3.TransformCoordinatesFromFloatsToRef(
        bounds[o + (corner & 1 ? 3 : 0)],
        bounds[o + 1 + (corner & 2 ? 3 : 0)],
        bounds[o + 2 + (corner & 4 ? 3 : 0)],
        boneWorldTmp,
        tmpVec3
      );
      Vector3.CheckExtends(tmpVec3, min, max);
    }
  }

  return true;
}

/**
 * Extends min/max by the mesh's currently posed vertex bounds in mesh-local
 * space (per-bone bounds × current bone matrices, no CPU re-skinning).
 * Returns false when the mesh has no usable skin data.
 */
function extendByPosedLocalBounds(
  mesh: AbstractMesh,
  min: Vector3,
  max: Vector3
): boolean {
  const skeleton = mesh.skeleton;
  if (!skeleton) return false;

  const boneCount = skeleton.bones.length;
  const bounds = boneLocalBounds(mesh, boneCount);
  skeleton.prepare();
  const matrices = skeleton.getTransformMatrices(mesh);
  if (!bounds || !matrices || matrices.length < boneCount * 16) return false;

  for (let b = 0; b < boneCount; b++) {
    const o = b * 6;
    if (bounds[o] === Number.POSITIVE_INFINITY) continue;

    Matrix.FromArrayToRef(matrices, b * 16, tmpMatrix);

    for (let corner = 0; corner < 8; corner++) {
      Vector3.TransformCoordinatesFromFloatsToRef(
        bounds[o + (corner & 1 ? 3 : 0)],
        bounds[o + 1 + (corner & 2 ? 3 : 0)],
        bounds[o + 2 + (corner & 4 ? 3 : 0)],
        tmpMatrix,
        tmpVec3
      );
      Vector3.CheckExtends(tmpVec3, min, max);
    }
  }

  return true;
}

/** Frames over which a freshly loaded skinned mesh's culling box is grown. */
const SKINNED_BOUNDS_FRAMES = 60;

type PendingBounds = { mesh: AbstractMesh; min: Vector3; max: Vector3; frames: number };
const pendingSkinnedBounds = new WeakMap<Scene, PendingBounds[]>();

/**
 * The box the grow pass settled on, per shared geometry. Every clone of a
 * model poses the same vertices through the same clip, so the second and
 * later instances can take the answer straight away instead of each running
 * their own 60-frame, per-bone, 8-corner pass.
 */
const settledSkinnedBounds = new WeakMap<
  object,
  { min: Vector3; max: Vector3 }
>();

/**
 * Gives a skinned mesh a local bounding box that covers its posed vertices.
 * The converter stores vertices relative to their bone, so the raw position
 * bounds Babylon computes at load collapse near the origin; with frustum
 * clipping on, a long wall piece is culled as soon as that tiny box leaves
 * the screen. The real placement of a BMD object's parts comes from its
 * animation (frame 0 even for static props), which is not applied yet inside
 * `load()`, so the box is grown after each of the first few rendered frames
 * — this also covers swaying trees and flags — and then left alone; Babylon's
 * `_updateBoundingInfo` carries it along with the world matrix each frame.
 */
function fixSkinnedLocalBounds(mesh: AbstractMesh): void {
  if (!mesh.skeleton) return;

  const settled = settledSkinnedBounds.get(vertexDataKey(mesh));
  if (settled) {
    mesh.setBoundingInfo(new BoundingInfo(settled.min, settled.max));
    return;
  }

  const scene = mesh.getScene();

  let pending = pendingSkinnedBounds.get(scene);
  if (!pending) {
    pending = [];
    pendingSkinnedBounds.set(scene, pending);
    scene.onAfterRenderObservable.add(() => {
      const list = pendingSkinnedBounds.get(scene);
      if (!list || list.length === 0) return;

      for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
        if (entry.mesh.isDisposed()) {
          list.splice(i, 1);
          continue;
        }
        const prevMinX = entry.min.x;
        const prevMaxX = entry.max.x;
        const prevMinY = entry.min.y;
        const prevMaxY = entry.max.y;
        const prevMinZ = entry.min.z;
        const prevMaxZ = entry.max.z;
        if (!extendByPosedLocalBounds(entry.mesh, entry.min, entry.max)) {
          list.splice(i, 1);
          continue;
        }
        entry.frames++;
        if (
          entry.min.x !== prevMinX || entry.max.x !== prevMaxX ||
          entry.min.y !== prevMinY || entry.max.y !== prevMaxY ||
          entry.min.z !== prevMinZ || entry.max.z !== prevMaxZ
        ) {
          entry.mesh.setBoundingInfo(new BoundingInfo(entry.min, entry.max));
        }
        if (entry.frames >= SKINNED_BOUNDS_FRAMES) {
          settledSkinnedBounds.set(vertexDataKey(entry.mesh), {
            min: entry.min.clone(),
            max: entry.max.clone(),
          });
          list.splice(i, 1);
        }
      }
    });
  }

  pending.push({
    mesh,
    min: new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE),
    max: new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE),
    frames: 0,
  });
}

/**
 * `o->HiddenMesh = -2` — hide the whole body rather than one mesh index.
 * The original's operate boxes and effect-replaced props use it.
 */
export const HIDDEN_MESH_ALL = -2;

export class ModelObject {
  static OverrideScale = -1;

  Type: number = -1;

  /**
   * Set for the props that come out of the map's object list, and for nothing
   * else — `modelId` is assigned in `createObjects` alone. Characters, NPCs,
   * monsters, items and UI models all leave it false, which is what keeps the
   * blob-shadow size gate off them: a small monster still needs its shadow,
   * a ground flower does not.
   */
  IsMapObject = false;
  WorldIndex: ENUM_WORLD = ENUM_WORLD.WD_0LORENCIA;

  /**
   * `o->HiddenMesh` (ZzzObject.cpp). A mesh index skips that one mesh in
   * `DrawMesh`; `HIDDEN_MESH_ALL` (-2) hides the *whole body* — the model is
   * still loaded, animated and pickable, it is simply never drawn. The
   * original uses it for operate boxes (pose boxes, Dungeon 60, Devias 91,
   * Atlans 39, Market 67) and for props replaced by an effect (Dungeon 52).
   */
  HiddenMesh = -1;

  BlendMesh = NO_BLEND_MESH;

  BlendMeshLight = 1;

  /**
   * `Models[type].StreamMesh` (ZzzBMD.cpp:990-1001): this mesh is drawn
   * textured but *unlit* - flat `BodyLight` instead of the per-vertex terrain
   * light - and its UVs may scroll. Waterfalls, sand-falls and the Dungeon
   * flesh curtains. -1 = none.
   */
  StreamMesh = -1;

  /** Live `BlendMeshTexCoordU/V`, shared by reference with the mesh metadata. */
  readonly UvScroll = { u: 0, v: 0 };

  #meshAnimation: MeshAnimation | null = null;
  #animatedMesh: AbstractMesh | null = null;

  GlowBlendMesh = false;
  /**
   * Play speed in the original's units (BMD keys per 25 Hz tick, e.g. idle
   * 0.28, walk 0.30). See common/playSpeed.ts for the tables.
   */
  AnimationSpeed = 0.28;
  /** Per-action PlaySpeed overrides (the original's `Actions[i].PlaySpeed` edits). */
  readonly ActionPlaySpeeds = new Map<number, number>();

  /**
   * Seconds between two keys of each clip as authored in the GLB. The
   * converter (tools/bmdToGlb.ts) bakes the BMD action's own PlaySpeed into
   * the key times (dt = 1 / (PlaySpeed × 24)), so the Babylon speedRatio
   * must be relative to that, not to a fixed 24 keys/s.
   */
  private readonly _bakedKeyDt = new Map<number, number>();

  /**
   * Frame of the last *authored* key of each clip.
   *
   * The converter closes every clip with a duplicate of key 0 — the wrap
   * segment the original interpolates through (tools/bmdToGlb.ts). That is
   * right for a loop and wrong for a one-shot, which holds wherever it stops:
   * played to `group.to` a Die clip runs on past the collapsed body, back up
   * through the wrap into the standing pose of key 0, and freezes there —
   * a monster that dies, stands up, and fades away on its feet. The original
   * stops a one-shot on the last authored key (`PlayAnimation`,
   * ZzzBMD.cpp:415); `startGroup` makes that the clip's `to`.
   */
  private readonly _lastRealFrame = new Map<number, number>();

  /** Babylon speedRatio that advances `AnimationSpeed` keys per 25 Hz tick for an action. */
  speedRatioFor(actionIndex: number): number {
    const keyDt = this._bakedKeyDt.get(actionIndex) ?? 1 / 24;
    return this.AnimationSpeed * PLAY_SPEED_TO_RATIO * 24 * keyDt;
  }

  get speedRatio(): number {
    return this.speedRatioFor(this.CurrentAction);
  }
  BodyHeight: Float = 0;
  CurrentAction: Int = 0;
  LoopAction = true;
  LinkParent = false;
  ActionIterationWasFinished = false;
  /**
   * Bumped every time an action (re)starts from its first frame — the
   * original's `AnimationFrame == 0` moment that sound/effect code keys on
   * (CombatSfxSystem).
   */
  actionSerial = 0;
  Ready = false;

  LoadFailed = false;
  /**
   * No part of this model (or of its bone-linked children) is inside the
   * camera frustum. Driven by `updateFrustumVisibility`; while set, the model
   * skips its per-frame Update and its animation clips are paused.
   *
   * Babylon already frustum-culls the *drawing* of these meshes, but an
   * `AnimationGroup` keeps interpolating every bone of every loaded model
   * whether or not it is on screen — in Lorencia most of what sits inside
   * `CalculateVisibilitySystem`'s 32-tile radius is behind the camera.
   */
  OutOfView = false;
  Visible = true;
  /** o->Alpha: per-mesh visibility of this model and its bone-linked children. */
  Alpha = 1;

  setAlpha(alpha: number) {
    alpha = Math.max(0, Math.min(1, alpha));
    if (alpha === this.Alpha) return;
    this.Alpha = alpha;
    for (const mesh of this._node.getChildMeshes(false)) {
      mesh.visibility = alpha;
    }
    this.syncShadowEnabled();
    for (const child of this.Children) child.setAlpha(alpha);
  }
  Parent?: ModelObject;
  Children: ModelObject[] = [];

  SkipBoundingBox = false;

  BoundingBoxLocal = new BoundingBox(Vector3.Zero(), Vector3.Zero());

  Light = new Vector3(1, 1, 1);

  SelfLight = new Vector3(0, 0, 0);

  CastsShadow = true;

  /**
   * Whether snow may settle on this object (weather/snowCaps.ts). Set by
   * MapTileObject on snow maps; every mesh carries it as `metadata.snowCap`
   * for the item material to bind against.
   */
  SnowCap = false;

  /**
   * Whether `BlendMesh` casts a shadow with the rest of the body.
   *
   * Off by default, which is `AddMeshShadowTriangles`' `mesh->Texture ==
   * blendMesh -> continue` (ZzzBMD.cpp:2306): the blend mesh is an additive
   * glow card, and light does not cast a shadow. `WingObject` turns it on
   * because on a wing that card *is* the wing — see the note there.
   */
  ShadowBlendMeshCasts = false;

  Lights: MapObjectLights | null = null;

  ParentBoneLink = -1;
  /**
   * The original's link matrix (`RenderLinkObject`, Link=true) in bone space,
   * as a Babylon matrix with metre translation. Identity = the item's BMD
   * frame sits straight in the bone frame (Link=false, the in-hand case). It
   * may be non-orthogonal — see weaponAttachment.ts — so it is applied as a
   * raw pre-transform on an intermediate node, never decomposed into TRS.
   */
  BoneLinkMatrix = Matrix.Identity();
  private _linkedBone = -1;
  private _boneSocket: TransformNode | null = null;

  /** Re-targets the bone attachment; takes effect on the next Update(). */
  setBoneLink(bone: number, link?: Matrix) {
    this.ParentBoneLink = bone;
    if (link) this.BoneLinkMatrix.copyFrom(link);
    else Matrix.IdentityToRef(this.BoneLinkMatrix);
    this._linkedBone = -1;
  }
  loadSeq = 0;
  private _node: TransformNode;
  /** Blob shadow clone per slot; a slot is null until it is first needed. */
  private _shadows: (AbstractMesh | null)[] = [];

  /**
   * The model's own meshes as of `load()`, kept so the per-frame frustum test
   * does not allocate a child list. Bone-linked children are not in here —
   * they hang off this model's bones, so they are covered by their owner's
   * `Children` walk in `anyMeshInFrustum`.
   */
  private _frustumMeshes: AbstractMesh[] = [];

  /** Consecutive frames fully outside the frustum; see OUT_OF_VIEW_GRACE. */
  private _outOfViewFrames = 0;

  /** Last enabled state pushed to the shadow clones, and the state serial it was computed from. */
  private _shadowsVisible: boolean | null = null;
  private _shadowsSerial = -1;
  gltf: {
    mesh: AbstractMesh;
    skeleton: Skeleton;
    animationGroups: AnimationGroup[];
  } | null = null;

  NodeNamePrefix = '';

  get objectDir() {
    // Blood / Chaos Castle floors share `Object12` / `Object19` (worldAssets.ts).
    return `Object${assetWorldNum(this.WorldIndex)}/`;
  }

  get node(): TransformNode {
    return this._node;
  }

  get rootObject(): ModelObject {
    let owner: ModelObject = this;
    while (owner.Parent) owner = owner.Parent;
    return owner;
  }

  constructor(
    private readonly scene: Scene,
    private readonly parent?: TransformNode
  ) {
    this._node = new TransformNode('modelObject', this.scene);
    this._node.rotationQuaternion = null;

    if (parent) {
      this._node.setParent(parent);
    }
  }

  init(_world: World, _entity: Entity): Promise<void> {
    return Promise.resolve();
  }

  playAction(actionIndex: number, loop: boolean = true) {
    if (!this.gltf) return;

    const prevAction = this.CurrentAction;
    if (prevAction === actionIndex) return;

    if (prevAction !== -1) {
      const prevAnimationGroup = this.gltf.animationGroups[prevAction];
      if (prevAnimationGroup) {
        prevAnimationGroup.stop();
      }
    }

    this.CurrentAction = actionIndex;
    this.LoopAction = loop;
    this.ActionIterationWasFinished = false;
    this.actionSerial++;

    const animationGroup = this.gltf.animationGroups[actionIndex];
    if (animationGroup) {
      this.startGroup(animationGroup, actionIndex, loop);
      // A clip started while off screen must not run; one-shots are exempt
      // (see applyAnimationPause).
      if (loop && this.OutOfView) animationGroup.pause();
    }
  }

  /**
   * Starts one clip from its first frame.
   *
   * A loop plays the whole range, wrap segment included — that segment is the
   * cycle closing. A one-shot stops one key short of it (`_lastRealFrame`)
   * and holds there, which is where the original leaves a Die or a swing.
   */
  private startGroup(
    group: AnimationGroup,
    actionIndex: number,
    loop: boolean
  ): void {
    // stop(true): this group may be the one being restarted, and a plain
    // stop() would raise the end observer and mark the fresh action finished.
    if (group.isStarted) group.stop(true);

    const speed = this.speedRatioFor(actionIndex);
    group.speedRatio = speed;

    const to = loop ? undefined : this._lastRealFrame.get(actionIndex);
    group.start(loop, speed, group.from, to);
  }

  /**
   * Sets `AnimationSpeed` *and* pushes it into the clip that is already
   * playing. Plain assignment only takes effect on the next `playAction`,
   * which is fine for characters (their rate changes with the action) but not
   * for parts whose rate changes under a single looping clip — a wing beats
   * at 0.25 on the ground and 1.0 in the air without ever changing action.
   */
  setAnimationSpeed(speed: number) {
    if (this.AnimationSpeed === speed) return;
    this.AnimationSpeed = speed;

    const group = this.gltf?.animationGroups[this.CurrentAction];
    if (group) group.speedRatio = this.speedRatio;
  }

  /** Restarts the current action from its first frame (repeated attacks / hits). */
  restartAction() {
    if (!this.gltf) return;
    const group = this.gltf.animationGroups[this.CurrentAction];
    if (!group) return;
    this.ActionIterationWasFinished = false;
    this.actionSerial++;
    this.startGroup(group, this.CurrentAction, this.LoopAction);
  }

  /** 0..1 position inside the current iteration of the playing action. */
  actionProgress(): number {
    const group = this.gltf?.animationGroups[this.CurrentAction];
    const animatable = group?.animatables[0];
    if (!group || !animatable) return 0;
    const span = group.to - group.from;
    if (!(span > 0)) return 1;
    return Math.max(0, Math.min(1, (animatable.masterFrame - group.from) / span));
  }

  /**
   * The original's `o->AnimationFrame`: BMD keys into the current action,
   * fractional. What the C++ effect code compares against (`AnimationFrame
   * >= 3.f` for a weapon blur, the hit keys).
   */
  actionFrame(): number {
    const group = this.gltf?.animationGroups[this.CurrentAction];
    if (!group) return 0;
    const fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    const keyDt = this._bakedKeyDt.get(this.CurrentAction) ?? 1 / 24;
    const keys = (group.to - group.from) / fps / keyDt;
    return this.actionProgress() * keys;
  }

  /** Wall-clock seconds of one iteration of an action at the current AnimationSpeed. */
  getActionDuration(actionIndex: number): number {
    const group = this.gltf?.animationGroups[actionIndex];
    if (!group) return 0;
    const fps = group.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    const speed = Math.max(0.0001, this.speedRatioFor(actionIndex));
    return (group.to - group.from) / fps / speed;
  }

  /**
   * Pauses/resumes the clips of this model. **Looping clips only** — a
   * one-shot (attack swing, Die) is what several systems wait on
   * (`ActionIterationWasFinished`, `actionProgress`), so freezing one off
   * screen would stall a monster's corpse fade or hold a player in a swing.
   * Loops are where the cost is: every prop, NPC and monster in range runs
   * one continuously.
   */
  private applyAnimationPause(paused: boolean): void {
    const groups = this.gltf?.animationGroups;
    if (!groups) return;

    if (paused && !this.LoopAction) return;

    for (const group of groups) {
      if (!group.isStarted) continue;
      if (paused) group.pause();
      else if (group.isPlaying === false) group.restart();
    }
  }

  /** Frames outside the frustum before the clips are actually paused. */
  private static readonly OUT_OF_VIEW_GRACE = 3;

  /**
   * True when this model or any of its bone-linked children has a mesh inside
   * `planes`; `null` when there is nothing to test at all (the player rig is
   * a mesh-less skeleton — its body parts are separate child models).
   */
  private anyMeshInFrustum(planes: readonly Plane[]): boolean | null {
    let sawMesh = false;

    for (const mesh of this._frustumMeshes) {
      if (mesh.isDisposed() || mesh.getTotalVertices() === 0) continue;
      sawMesh = true;
      if (mesh.isInFrustum(planes as Plane[])) return true;
    }

    for (const child of this.Children) {
      const inside = child.anyMeshInFrustum(planes);
      if (inside === true) return true;
      if (inside !== null) sawMesh = true;
    }

    return sawMesh ? false : null;
  }

  /**
   * Re-evaluates `OutOfView` against the camera frustum. Called once per
   * frame per root model by `RenderSystem`; children follow their root.
   */
  updateFrustumVisibility(planes: readonly Plane[] | null): void {
    if (!this.Ready || !planes || planes.length === 0) return;

    const inside = this.anyMeshInFrustum(planes);

    if (inside !== false) {
      this._outOfViewFrames = 0;
      this.setOutOfView(false);
      return;
    }

    if (this._outOfViewFrames < ModelObject.OUT_OF_VIEW_GRACE) {
      this._outOfViewFrames++;
      return;
    }

    this.setOutOfView(true);
  }

  private setOutOfView(out: boolean): void {
    if (out === this.OutOfView) return;

    this.OutOfView = out;
    this.applyAnimationPause(out);
    this.syncShadowEnabled();

    for (const child of this.Children) child.setOutOfView(out);
  }

  load(gltf: {
    mesh: AbstractMesh;
    skeleton: Skeleton;
    animationGroups: AnimationGroup[];
  }) {
    if (this.gltf === gltf) return;

    const oldGltf = this.gltf;
    this.gltf = gltf;
    this._node.name = this.NodeNamePrefix + gltf.mesh.name;

    if (oldGltf && oldGltf !== gltf) {
      oldGltf.mesh.dispose();
    }

    gltf.mesh.setParent(this._node);
    gltf.mesh.position.setAll(0);
    gltf.mesh.scaling.set(1, -1, 1);
    gltf.mesh.rotationQuaternion = Quaternion.FromEulerAngles(
      -Math.PI / 2,
      0,
      0
    );

    if (this.LinkParent) {
      const parent = this.Parent;
      if (parent) {
        const parentSkeleton = parent.gltf?.skeleton;
        if (parentSkeleton) {
          this.gltf.mesh.getChildMeshes(true).forEach(mesh => {
            mesh.skeleton?.dispose();
            mesh.skeleton = parentSkeleton;
          });
        }
      }
    }

    this._bakedKeyDt.clear();
    this._lastRealFrame.clear();
    gltf.animationGroups.forEach((group, index) => {
      const anim = group.targetedAnimations[0]?.animation;
      const keys = anim?.getKeys();
      if (anim && keys && keys.length > 1) {
        this._bakedKeyDt.set(index, (keys[1].frame - keys[0].frame) / anim.framePerSecond);
        this._lastRealFrame.set(index, keys[keys.length - 2].frame);
      }
      group.speedRatio = this.speedRatioFor(index);
      const markFinished = () => {
        if (this.gltf === gltf && this.CurrentAction === index) {
          this.ActionIterationWasFinished = true;
        }
      };
      group.onAnimationGroupEndObservable.add(markFinished);
      group.onAnimationGroupLoopObservable.add(markFinished);
    });

    const bodyLight = this.rootObject.Light;

    this._frustumMeshes = gltf.mesh.getChildMeshes(false);
    this._outOfViewFrames = 0;
    this.OutOfView = false;

    this._frustumMeshes.forEach(mesh => {
      mesh.metadata ??= {};

      mesh.metadata.SkipBoundingBox =
        this.SkipBoundingBox || mesh.metadata.hiddenByScript === true;

      mesh.metadata.bodyLight = bodyLight;
      mesh.metadata.snowCap = this.SnowCap;

      // Enhanced lighting: the sun's cascaded shadow map only
      // attenuates the sun's own lambert term, so the bake and the point
      // lights are untouched. Free while no shadow generator exists.
      mesh.receiveShadows = true;
      mesh.metadata.csmCaster =
        this.CastsShadow && !this.Lights?.emitsLight;

      // Lets the cascades keep this object's blend mesh as a caster, the same
      // exception `createObjectShadow` makes for the blobs.
      mesh.metadata.shadowBlendCaster = this.ShadowBlendMeshCasts;

      // What the G-buffer (SSAO + the height fog) takes in, and deliberately
      // not the same set as the sun's casters: an object the map marks
      // `CastsShadow = false`, or one carrying a light, still stands in front
      // of the camera and still has to be fogged by its own depth rather than
      // by whatever is behind it. See `occludes` in enhancedLighting.
      mesh.metadata.depthOccluder = true;

      fixSkinnedLocalBounds(mesh);
    });

    this.applyBlendMesh();

    this.applyMeshAnimation();

    this.applyHiddenMesh();

    this.applyWholeBodyHide();

    this.attachShadow();

    this.Ready = true;
  }

  /**
   * `o->HiddenMesh = n` (n >= 0): `DrawMesh` skips that one mesh. The monster
   * models pack several variants into one BMD and hide the ones the current
   * type does not wear — a plain Bull Fighter hides mesh 0, an Elite one keeps
   * it (`Setting_Monster`, ZzzCharacter.cpp:13801-13812).
   */
  private applyHiddenMesh() {
    if (this.HiddenMesh < 0 || !this.gltf) return;

    const mesh = this.getMesh(this.HiddenMesh);
    if (!mesh) return;

    mesh.isVisible = false;
    mesh.metadata ??= {};
    mesh.metadata.csmCaster = false;
    mesh.metadata.SkipBoundingBox = true;
  }

  /** True while `HiddenMesh` asks for the whole body to be skipped. */
  get bodyHidden(): boolean {
    return this.HiddenMesh === HIDDEN_MESH_ALL;
  }

  /**
   * `HiddenMesh = -2` in `RenderObject`: the original walks the mesh list and
   * draws nothing. Here the meshes stay loaded (so bones, animation and the
   * pick ray still work) but leave the render list, and the object stops
   * casting a shadow — an operate box has no body to cast one.
   */
  private applyWholeBodyHide() {
    if (!this.bodyHidden || !this.gltf) return;

    this.CastsShadow = false;

    for (const mesh of this._node.getChildMeshes(false)) {
      mesh.isVisible = false;
      mesh.metadata ??= {};
      mesh.metadata.csmCaster = false;
    }
  }

  /**
   * Binds the per-frame UV/brightness writes from `meshAnimation.ts` to the
   * mesh they target. A `stream` mesh also swaps to the flat-lit material:
   * the original draws it with `glColor3fv(BodyLight)` and no lighting, so
   * leaving it lit would make a waterfall go dark at night.
   */
  protected applyMeshAnimation() {
    if (!this.gltf) return;

    const anim = meshAnimationFor(this.WorldIndex, this.Type);
    if (!anim) return;

    const mesh = this.getMesh(anim.mesh);

    if (!mesh) {
      console.warn(
        `meshAnimation mesh ${anim.mesh} is out of range for world ` +
          `${this.WorldIndex} type ${this.Type}`
      );
      return;
    }

    this.#meshAnimation = anim;
    this.#animatedMesh = mesh;

    mesh.metadata ??= {};
    mesh.metadata.uvScroll = this.UvScroll;

    if (anim.kind === 'stream') {
      this.StreamMesh = anim.mesh;

      // Unlit *and* scrolling: `getFlatLitVariant` returns the scroll-capable
      // flat-lit material, so this covers both in one swap.
      const flat = getFlatLitVariant(mesh.getScene(), mesh);
      if (flat) mesh.material = flat;

      mesh.metadata.blendMeshLight = this.BlendMeshLight;
    } else if (anim.u || anim.v) {
      // A `blend` scroller is already on the shared additive material from
      // `applyBlendMesh`; move it to the scrolling twin. Skipped when the
      // table only animates `light`, which needs no shader change at all —
      // that is every Atlans entry.
      const scroll = getScrollVariant(mesh.getScene(), mesh);
      if (scroll) mesh.material = scroll;
    }
  }

  /** Advances the table's writes; called from Update while on screen. */
  protected updateMeshAnimation(timeMs: number) {
    const anim = this.#meshAnimation;
    if (!anim) return;

    if (anim.u) this.UvScroll.u = anim.u(timeMs);
    if (anim.v) this.UvScroll.v = anim.v(timeMs);

    if (anim.light && this.#animatedMesh) {
      this.#animatedMesh.metadata.blendMeshLight = anim.light(timeMs);
    }
  }

  private applyBlendMesh() {
    if (this.BlendMesh < 0 || !this.gltf) return;

    const mesh = this.getMesh(this.BlendMesh);

    if (!mesh) {
      console.warn(
        `BlendMesh ${this.BlendMesh} is out of range for type ${this.Type}`
      );
      return;
    }

    mesh.material = getMaterial(
      mesh.getScene(),
      false,
      2,
      BlendState.ALPHA_ONEOE,
      true
    );

    mesh.metadata ??= {};
    mesh.metadata.brightMesh = true;
    mesh.metadata.blendMeshLight = this.BlendMeshLight;

    if (this.GlowBlendMesh) {
      storeRef().world?.scene.look?.glow.referenceMeshToUseItsOwnMaterial(
        mesh as Mesh
      );
      // Marks the mesh as a live glow source for sceneLook's layer gate.
      mesh.metadata.glowOwnMaterial = true;
      requestGlowProbe();
    }
  }

  /**
   * Below this height, in tiles, a map object gets no blob shadow.
   *
   * A blob is a full clone of the caster's submesh hierarchy plus its own
   * draw call, and Noria places 9399 objects — 2336 of them ground flowers
   * about a third of a tile tall. The shadow of a thing that short is a
   * smudge under a thing already touching the ground: it costs a mesh and a
   * draw call to change nothing on screen. Lorencia is 2154 objects and never
   * made this hurt; the foliage maps are where an eager per-object clone stops
   * being affordable.
   *
   * Characters are exempt — see `_castsBlobShadow`.
   */
  static BLOB_SHADOW_MIN_HEIGHT = 0.75;

  /**
   * Above this footprint, in tiles (the longer of the model's x / z extents
   * under its scale), a map object gets no blob shadow either.
   *
   * The projection is MU's `CalcShadowPosition`: it flattens the caster onto
   * the terrain height and leans it in proportion to how high each vertex
   * sits. It was written for a character on open ground, and the original
   * never pointed it at anything else (map-object shadows are
   * ours"). Pointed at scenery that *is* the ground — Devias' cliff faces and
   * mountains, the walls of a keep — it does two wrong things at once: the
   * flattened silhouette lands on the terrain directly under the rock, which
   * is the rock's own visible face, so the whole face goes flat grey; and its
   * lean is several tiles, so the streak reaches whatever stands beside it.
   * Those objects' shading is already in the terrain bake and in their own
   * lightmap, which is where the original leaves it.
   *
   * Four tiles is well over the widest thing that should cast — a tree
   * crown, a market stall, a statue — and well under the smallest cliff piece.
   */
  static BLOB_SHADOW_MAX_FOOTPRINT = 4;

  /** Cached result of the size gate; the model's size never changes. */
  private _blobShadowWorthIt: boolean | null = null;

  /**
   * `true` when the caster is tall enough for its blob to read, and not so
   * wide that it is scenery. Measured off the bind-pose bounds under the
   * node's own scale, so a scaled-down instance of a tall model is judged on
   * what it actually is.
   */
  private get _blobShadowIsVisible(): boolean {
    if (this._blobShadowWorthIt !== null) return this._blobShadowWorthIt;

    const root = this.gltf?.mesh;
    if (!root) return false;

    let height = 0;
    let footprint = 0;

    for (const mesh of root.getChildMeshes(false)) {
      if (mesh.getTotalVertices() === 0) continue;
      const box = mesh.getBoundingInfo().boundingBox;
      height = Math.max(height, box.maximum.y - box.minimum.y);
      footprint = Math.max(
        footprint,
        box.maximum.x - box.minimum.x,
        box.maximum.z - box.minimum.z
      );
    }

    const scale = Math.abs(this._node.scaling.x);

    this._blobShadowWorthIt =
      height * scale >= ModelObject.BLOB_SHADOW_MIN_HEIGHT &&
      footprint * scale <= ModelObject.BLOB_SHADOW_MAX_FOOTPRINT;

    return this._blobShadowWorthIt;
  }

  /** Whether this model is allowed a shadow clone at all (see attachShadow). */
  private get _castsBlobShadow(): boolean {
    if (!this.CastsShadow || this.Lights?.emitsLight || !this.gltf) return false;

    // Only map objects are size-gated. A small monster still needs its
    // shadow; a ground flower does not.
    return !this.IsMapObject || this._blobShadowIsVisible;
  }

  /**
   * Creates the shadow clone the first time something actually calls for it,
   * then keeps its enabled state in step with the lighting and with the
   * frustum.
   *
   * Nothing here is built speculatively. A clone is a full copy of the
   * caster's submesh hierarchy and a second set of draw calls, so on a tier
   * where the shadow never activates it should never exist — and when the
   * player turns shadows off, the maps they have not visited yet cost nothing
   * at all.
   */
  private updateShadowSlots() {
    if (this._shadows.length === 0) return;

    for (let slot = 0; slot < this._shadows.length; slot++) {
      if (this._shadows[slot] || !blobShadowsActive()) continue;
      if (!this._castsBlobShadow) continue;

      this._shadows[slot] = createObjectShadow(
        this.gltf!.mesh,
        this._node,
        this.rootObject.node,
        slot,
        {
          blendMesh: this.ShadowBlendMeshCasts,
          keyed: !this.IsMapObject,
        }
      );

      this._shadowsVisible = null;
    }

    this.syncShadowEnabled();
  }

  /**
   * A shadow clone draws whenever its slot is lit, the caster is solid and
   * the caster is on screen. The last condition is the point: the clones opt
   * out of Babylon's frustum culling (their vertex shader moves them to the
   * ground, away from their own bounds), so without this every loaded
   * object's shadow is submitted every frame — most of them behind the
   * camera. `OutOfView` is measured against a frustum widened past the
   * projection's reach (RenderSystem), so a caster just off screen still
   * draws the shadow that pokes into view.
   */
  private syncShadowEnabled(): void {
    if (this._shadows.length === 0) return;

    const visible = !this.OutOfView && this.Alpha >= 1;
    const serial = shadowStateVersion();

    if (visible === this._shadowsVisible && serial === this._shadowsSerial) {
      return;
    }

    this._shadowsVisible = visible;
    this._shadowsSerial = serial;

    for (let slot = 0; slot < this._shadows.length; slot++) {
      this._shadows[slot]?.setEnabled(visible && blobShadowsActive());
    }
  }

  private attachShadow() {
    for (const shadow of this._shadows) shadow?.dispose(false, false);

    this._shadows = [];
    this._shadowsVisible = null;
    this._shadowsSerial = -1;

    if (!this._castsBlobShadow) return;

    // Both slots are created lazily, by `updateShadowSlots`. Slot 0 used to be
    // built here, for every caster, whether or not anything would ever draw
    // it — which on Enhanced and Ultra is *never*, because the CSM owns the sun
    // and slot 0 only draws for a torch. On a 9399-object map that was 9399
    // submesh-hierarchy clones built during the load and held for the life of
    // the map, to be disabled on the next frame.
    this._shadows = new Array(SHADOW_SLOTS).fill(null);

    this.updateShadowSlots();
  }

  setParent(parent: ModelObject): void {
    if (this.Parent) {
      const index = this.Parent.Children.indexOf(this);
      if (index !== -1) {
        this.Parent.Children.splice(index, 1);
      }
    }

    this.Parent = parent;
    parent.Children.push(this);
  }

  getMesh(ind: number) {
    return this.gltf?.mesh.getChildMeshes(false)[ind];
  }

  getMaterial(ind: number) {
    return this.getMesh(ind)!.material as StandardMaterial;
  }

  getMeshes(recursiveWithChildren = false): Mesh[] {
    if (!this.gltf) return [];

    return this.gltf.mesh.getChildMeshes(!recursiveWithChildren);
  }

  setActionSpeed(actionType: number, speed: number) {
    this.ActionPlaySpeeds.set(actionType, speed);
  }

  /** PlaySpeed override for an action, if one was set via setActionSpeed. */
  actionPlaySpeed(actionType: number): number | undefined {
    return this.ActionPlaySpeeds.get(actionType);
  }

  Update(gameTime: World['gameTime']): void {
    if (!this.Ready || this.OutOfView) return;

    // `MoveObject`'s per-frame UV / BlendMeshLight writes. WorldTime is in
    // milliseconds, which is what the table's saw-tooths are written against.
    // It sits here rather than in MapTileObject because several map props
    // (Lorencia's candles, Devias' candelabra) extend ModelObject directly,
    // and the early-out above already skips it off screen — the uniform is
    // only read while the mesh is drawn.
    this.updateMeshAnimation(gameTime.TotalGameTime.TotalSeconds * 1000);

    this.Lights?.update();

    this.updateShadowSlots();

    if (this.ParentBoneLink >= 0) {
      const parent = this.Parent;
      if (parent && parent.gltf?.skeleton) {
        const bone = parent.gltf.skeleton.bones[this.ParentBoneLink + 1];
        const node = bone?.getTransformNode();
        if (node && this._linkedBone !== this.ParentBoneLink) {
          // bone → socket (the original's link matrix, raw) → this node
          // (C⁻¹) → item root (C, from load()). C = rotX(-90°)·scale(1,-1,1)
          // is the loader basis change every model root carries, so C⁻¹ is
          // rotX(-90°) with a (1,-1,1) scale. Without the mirror the item is
          // left Z-mirrored in bone space, which happens to look right in one
          // hand and wrong in the other.
          const socket =
            this._boneSocket ??
            (this._boneSocket = new TransformNode(
              this.NodeNamePrefix + 'boneSocket',
              this.scene
            ));
          socket.setPreTransformMatrix(this.BoneLinkMatrix.clone());
          socket.parent = node;
          this._node.parent = socket;
          this._node.position.setAll(0);
          this._node.rotationQuaternion = DEFAULT_BONE_LINK_ROTATION.clone();
          this._node.scaling.set(1, -1, 1);
          this._linkedBone = this.ParentBoneLink;
        }
      }
    }
  }

  Draw(_gameTime: World['gameTime']): void {
    if (!this.Visible) return;

    // The base DrawMesh is a no-op hook; only walk (and allocate) the mesh
    // list for subclasses that actually override it (HouseWallObject flicker).
    if (this.DrawMesh === ModelObject.prototype.DrawMesh) return;

    const meshes = this.getMeshes();
    for (let i = 0; i < meshes.length; i++) this.DrawMesh(i);
  }

  DrawMesh(mesh: Int): void {
    if (this.HiddenMesh === mesh || this.bodyHidden) return;
  }

  /**
   * Optional model-less pick box in local tile units (Babylon Y-up), mirroring
   * the fixed `BoundingBoxMin/Max` the original assigns to invisible operate
   * triggers (pose boxes: `(-40,-40,0)…(40,40,160)`, ZzzObject.cpp:4585).
   * Used when the object has no mesh to derive bounds from.
   */
  FixedBoundingBox: { min: Vector3; max: Vector3 } | null = null;

  private _boundsFrameId = -1;

  /**
   * World-space AABB of the model, like the original's per-model
   * `BoundingBoxMin/Max` transformed by the object matrix: the mesh's
   * bind-pose bounds under the current node transform (bone-linked children
   * follow their bones). It deliberately does not re-skin the vertices on the
   * CPU (`refreshBoundingInfo(true)`) — that cost ~10 ms per character per
   * call and was being called by three systems per frame.
   *
   * Memoised per frame so the cursor, pointer and debug systems share one
   * computation.
   */
  UpdateBoundings() {
    const frameId = this.scene.getFrameId();
    if (frameId === this._boundsFrameId) return;
    this._boundsFrameId = frameId;

    // The original overwrites `BoundingBoxMax` outright for operate boxes
    // (ZzzObject.cpp:4585), so a fixed box wins over the model's own even
    // when the model is loaded and merely hidden.
    if (!this.gltf || this.FixedBoundingBox) {
      const fixed = this.FixedBoundingBox;
      if (!fixed) return;
      const p = this._node.position;
      const s = this._node.scaling.x || 1;
      this.BoundingBoxLocal.minimumWorld.set(
        p.x + fixed.min.x * s,
        p.y + fixed.min.y * s,
        p.z + fixed.min.z * s
      );
      this.BoundingBoxLocal.maximumWorld.set(
        p.x + fixed.max.x * s,
        p.y + fixed.max.y * s,
        p.z + fixed.max.z * s
      );
      return;
    }

    // Union of the child meshes' world AABBs as Babylon left them after the
    // last world-matrix pass (at most one frame old). Not
    // getHierarchyBoundingVectors(): that calls scene.incrementRenderId(),
    // invalidating every cached world matrix in the scene, and force-recomputes
    // every descendant node (all skeleton joints included) — ~10 ms per
    // character.
    const meshes = this._node.getChildMeshes(
      false,
      n => !(n as AbstractMesh).metadata?.SkipBoundingBox
    );

    const min = this.BoundingBoxLocal.minimumWorld;
    const max = this.BoundingBoxLocal.maximumWorld;
    min.setAll(Number.MAX_VALUE);
    max.setAll(-Number.MAX_VALUE);

    for (const mesh of meshes) {
      if (mesh.getTotalVertices() === 0) continue;
      if (mesh.skeleton && extendBySkinnedBounds(mesh, min, max)) continue;
      const box = mesh.getBoundingInfo().boundingBox;
      Vector3.CheckExtends(box.minimumWorld, min, max);
      Vector3.CheckExtends(box.maximumWorld, min, max);
    }
  }

  /**
   * Extra height in world units the model floats at, on top of the terrain
   * height its entity carries. The original writes these straight into
   * `o->Position[2]` right after `RequestTerrainHeight`: +30 (or +90 in
   * Tarkan / Heaven) for a Dinorant rider (ZzzCharacter.cpp:6263-6273) and the
   * Budge Dragon's `(-|sin(Timer)| * 70 + 70)` bob (:6274-6277).
   */
  HoverHeight = 0;

  updateLocation(pos: IVector3Like, scale: Float, angles: IVector3Like) {
    this._node.position.set(pos.x, pos.y + this.HoverHeight, pos.z);

    this._node.rotation.x = angles.x;
    this._node.rotation.y = angles.y;
    this._node.rotation.z = angles.z;

    this._node.scaling.setAll(scale);
  }

  Unload() {
    this.loadSeq++;
    this.Ready = false;
    this._frustumMeshes = [];

    for (const shadow of this._shadows) shadow?.dispose(false, false);
    this._shadows = [];
    this._shadowsVisible = null;
    this._shadowsSerial = -1;

    if (this.gltf) {
      this.gltf.mesh.dispose(false, false);
      this.gltf.skeleton?.dispose();
      this.gltf.animationGroups.forEach(group => {
        group.dispose();
      });
      this.gltf = null;
    }
  }

  dispose(): void {
    this.Lights?.dispose();
    this.Lights = null;

    for (const shadow of this._shadows) shadow?.dispose(false, false);

    this._shadows = [];

    this._node.dispose();
    this._boneSocket?.dispose();
    this._boneSocket = null;
    if (this.gltf) {
      this.gltf.mesh.dispose(false, false);
      this.gltf.skeleton?.dispose();
      this.gltf.animationGroups.forEach(group => {
        group.dispose();
      });
      this.gltf = null;
    }

    this.Ready = false;

    for (const child of this.Children) {
      child.dispose();
    }

    this.Children.length = 0;
  }

  protected async loadSpecificModel(modelName: string) {
    this.load(await loadGLTF(`${this.objectDir}${modelName}`, storeRef().world!));
  }

  protected async loadSpecificModelWithDynamicID(
    modelId: number,
    namePrefix: string
  ) {
    const idx = (this.Type - modelId + 1).toString().padStart(2, '0');
    const name = `${namePrefix}${idx}.glb`;
    await this.loadSpecificModel(name);
  }
}
