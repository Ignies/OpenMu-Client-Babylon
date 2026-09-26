/**
 * Summon - an effect model its spawner drives tick by tick: the Summoner's
 * summoned beasts (MODEL_SUMMONER_SUMMON_SAHAMUTT / NEIL / LAGUL), Neil's
 * knives and ground rings. Unlike `model.ts`, each mesh is drawn the way its
 * own `RenderMesh` call asks (ZzzObject.cpp:1694-1771): bright (the sheet x
 * its light added), textured at `Alpha`, both, or not at all, each in its own
 * light; the clip is picked by index and run at the original's keys a tick;
 * and the spawner reads the bones the original hangs its sprites, fire and
 * ribbons on.
 *
 * Loading goes through the shared GLB container cache (`common/modelLoader.ts`);
 * the clone, its skeleton and its animation groups are this spawn's own and go
 * with it. Materials are the effects' cached additive ones (core.ts) and the
 * loader's shared flat-lit one; nothing compiles per spawn.
 *
 * Driven by: `effects.spawn('summon', ...)` from `common/skillVisuals.ts`. Read by: nobody.
 */
import {
  Material,
  Quaternion,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type AnimationGroup,
  type Mesh,
  type Scene,
  type Skeleton,
  type Texture,
} from '../libs/babylon/exports';
import { getMaterial, loadGLTF } from '../common/modelLoader';
import { BlendState } from '../common/objects/enum';
import { Store } from '../store';
import type { TestScene } from '../scenes/testScene';
import { LiveList, TICK, additiveMaterial, fxNow, pointSource, type RGB } from './core';
import { addEffectGlow, releaseEffectGlow } from './glow';
import { RGBS } from './recipes';
import type { EffectHandle, EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** `o->Velocity` of an effect model when the spawner sets none (ZzzEffect.cpp:370). */
const DEFAULT_KEYS_PER_TICK = 0.3;

const UPRIGHT = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);

// ---- 2. state + readers ----------------------------------------------------

/**
 * `add` is RENDER_BRIGHT (the sheet x `colour` added, at `Alpha`); `alpha` is RENDER_TEXTURE (the sheet
 * lit by `colour`, blended at `Alpha`, opaque at 1); `both` is RENDER_TEXTURE with a RENDER_BRIGHT pass
 * over it (Sahamutt's CHROME7 pass, drawn with the mesh's own UVs); `hide` is a mesh no call draws.
 */
export type SummonDraw = 'add' | 'alpha' | 'both' | 'hide';

export interface SummonMesh {
  draw?: SummonDraw;
  /** The mesh's light: `BodyLight`, clamped. Default white. */
  colour?: RGB;
  /** Sheet widths a second the U coordinate runs (`BlendMeshTexCoordU = -WorldTime * 0.001` is -1). */
  scrollU?: number;
}

export interface SummonOptions {
  /** `Skill/...glb` (recipes.ts `MODEL`). */
  model: string;
  /** Hard end of life, seconds (the original's LifeTime). */
  seconds: number;
  /** The original's `Scale`. */
  scale?: number;
  /** Initial yaw, radians (the same convention as `model.ts`). */
  yaw?: number;
  /** Per BMD mesh, in order; a mesh with no entry is drawn `add` in white. */
  meshes?: readonly SummonMesh[];
  /** BMD action to play and its `Velocity` in keys a tick (default 0 at 0.3). */
  clip?: number;
  keysPerTick?: number;
  /** Loop the clip (default) or play it once and hold its last key (`CurrentAction = 255`). */
  loop?: boolean;
  /** Initial `Alpha` (default 1). */
  alpha?: number;
  /**
   * Every frame with the time since the spawn in ticks: move `at`, turn, fade, re-clip. Returning
   * false ends the effect.
   */
  drive?: (body: SummonBody, ticks: number) => boolean | void;
  /** Ends it early. */
  until?: () => boolean;
}

export interface SummonBody {
  /** Where the model stands (its origin), world tiles. Write it to move the model. */
  readonly at: Vector3;
  yaw: number;
  /** `o->Alpha`: every drawn mesh's visibility. */
  alpha: number;
  /** True once the GLB is in and the bones can be read. */
  readonly loaded: boolean;
  readonly boneCount: number;
  /** Play action `clip` at `keysPerTick`; `holdKey` plays it once and stops on that key. */
  play(clip: number, keysPerTick: number, loop?: boolean, holdKey?: number): void;
  /** Change how one mesh is drawn (Neil turns textured once his Alpha reaches 0.7). */
  draw(mesh: number, draw: SummonDraw): void;
  /** World position of BMD bone `index` (`TransformPosition(BoneTransform[index])`); false before load. */
  bone(index: number, out: Vector3): boolean;
}

const live = new LiveList();

/** How many summon effects are up (debug). */
export function summonCount(): number {
  return live.size;
}

/** One U-scrolled clone per GLB texture, shared by every spawn that scrolls it; the offset is written once a frame. */
const scrolled = new Map<Texture, { tex: Texture; rate: number }>();

function scrolledTexture(src: Texture, rate: number): Texture {
  let s = scrolled.get(src);
  if (!s) {
    s = { tex: src.clone(), rate };
    scrolled.set(src, s);
  }
  return s.tex;
}

interface ClipRequest {
  clip: number;
  keysPerTick: number;
  loop: boolean;
  holdKey: number | undefined;
}

function startClip(groups: AnimationGroup[], r: ClipRequest): void {
  for (const g of groups) if (g.isStarted) g.stop();
  const group = groups[r.clip] ?? groups[0];
  if (!group) return;
  const anim = group.targetedAnimations[0]?.animation;
  const keys = anim?.getKeys();
  const step = keys && keys.length > 1 ? keys[1].frame - keys[0].frame : 0;
  // Keys a tick -> Babylon speed: the converter bakes one key every `step` frames at the clip's rate.
  const keyDt = anim && step > 0 ? step / anim.framePerSecond : 1 / 24;
  const ratio = (r.keysPerTick / TICK) * keyDt;
  if (r.holdKey !== undefined && step > 0) {
    group.start(false, ratio, group.from, Math.min(group.to, group.from + r.holdKey * step));
    return;
  }
  // The converter closes every clip with a copy of key 0; a one-shot stops on the last authored key.
  const last = keys && keys.length > 2 ? keys[keys.length - 2].frame : group.to;
  if (r.loop) group.start(true, ratio, group.from, group.to);
  else group.start(false, ratio, group.from, last);
}

function spawn(scene: Scene, at: Vector3, opts: SummonOptions): EffectHandle {
  const world = Store.world;
  const node = new TransformNode('fxSummon', scene);
  node.rotationQuaternion = null;
  node.scaling.setAll(opts.scale ?? 1);
  if (world) node.setParent(world.mapParent);

  const specs = opts.meshes ?? [];
  const drawOf: SummonDraw[] = [];
  let meshes: AbstractMesh[] = [];
  let overlays: (AbstractMesh | null)[] = [];
  let groups: AnimationGroup[] = [];
  let skeleton: Skeleton | null = null;
  let root: AbstractMesh | null = null;
  let disposed = false;
  let pending: ClipRequest | null = { clip: opts.clip ?? 0, keysPerTick: opts.keysPerTick ?? DEFAULT_KEYS_PER_TICK, loop: opts.loop ?? true, holdKey: undefined };
  const solid = getMaterial(scene, true, Material.MATERIAL_OPAQUE, BlendState.ALPHA_DISABLE, false, true);
  // RENDER_TEXTURE below Alpha 0.99 blends (ZzzBMD.cpp:1444-1451); the opaque material ignores `visibility`.
  const faded = getMaterial(scene, true, Material.MATERIAL_ALPHABLEND, BlendState.ALPHA_COMBINE, false, true);
  let fading = false;
  const glowScene = (scene as TestScene).look?.glow;

  const brightMaterial = (mesh: AbstractMesh, spec: SummonMesh | undefined) => {
    const tex = mesh.metadata?.diffuseTexture as Texture | undefined;
    if (!tex) return getMaterial(scene, false, Material.MATERIAL_ALPHABLEND, BlendState.ALPHA_ONEOE, true);
    const sheet = spec?.scrollU ? scrolledTexture(tex, spec.scrollU) : tex;
    return additiveMaterial(scene, sheet, spec?.colour ?? RGBS.white);
  };

  const applyDraw = (i: number): void => {
    const mesh = meshes[i];
    if (!mesh) return;
    const spec = specs[i];
    const d = drawOf[i] ?? 'add';
    mesh.isVisible = d !== 'hide';
    const bright = d === 'add';
    mesh.material = bright ? brightMaterial(mesh, spec) : fading ? faded : solid;
    mesh.metadata.brightMesh = bright;
    if (bright) addEffectGlow(scene, mesh);
    else releaseEffectGlow(mesh);
    let over = overlays[i];
    if (d === 'both' && !over) {
      over = (mesh as Mesh).clone(`${mesh.name}Bright`, mesh.parent);
      over.skeleton = mesh.skeleton;
      over.metadata = { ...mesh.metadata, brightMesh: true };
      over.material = brightMaterial(mesh, spec);
      over.isPickable = false;
      over.alwaysSelectAsActiveMesh = true;
      glowScene?.addExcludedMesh(over as never);
      addEffectGlow(scene, over);
      overlays[i] = over;
    }
    if (over) over.isVisible = d === 'both';
  };

  const body: SummonBody = {
    at: pointSource(at)(new Vector3()),
    yaw: opts.yaw ?? 0,
    alpha: opts.alpha ?? 1,
    get loaded() {
      return root !== null;
    },
    get boneCount() {
      return skeleton ? skeleton.bones.length - 1 : 0;
    },
    play(clip, keysPerTick, loop = true, holdKey) {
      pending = { clip, keysPerTick, loop, holdKey };
      if (groups.length) {
        startClip(groups, pending);
        pending = null;
      }
    },
    draw(mesh, draw) {
      if (drawOf[mesh] === draw) return;
      drawOf[mesh] = draw;
      applyDraw(mesh);
    },
    bone(index, out) {
      const n = skeleton?.bones[index + 1]?.getTransformNode();
      if (!n || !root || root.isDisposed()) return false;
      out.copyFrom(n.getAbsolutePosition());
      return true;
    },
  };
  specs.forEach((s, i) => (drawOf[i] = s.draw ?? 'add'));
  node.position.copyFrom(body.at);
  node.rotation.y = body.yaw;

  if (world) {
    void loadGLTF(opts.model, world)
      .then(gltf => {
        if (disposed) {
          gltf.mesh.dispose(false, false);
          gltf.skeleton?.dispose();
          for (const g of gltf.animationGroups) g.dispose();
          return;
        }
        root = gltf.mesh;
        skeleton = gltf.skeleton ?? null;
        groups = gltf.animationGroups;
        root.setParent(node);
        root.position.setAll(0);
        root.scaling.set(1, -1, 1);
        root.rotationQuaternion = UPRIGHT.clone();
        // The converter names nodes in BMD mesh order (node_0, node_1...).
        meshes = root.getChildMeshes(false).sort((a, b) => a.name.localeCompare(b.name));
        overlays = meshes.map(() => null);
        meshes.forEach((mesh, i) => {
          const c = specs[i]?.colour ?? RGBS.white;
          mesh.metadata ??= {};
          mesh.metadata.bodyLight = new Vector3(c[0], c[1], c[2]);
          mesh.isPickable = false;
          mesh.alwaysSelectAsActiveMesh = true;
          glowScene?.addExcludedMesh(mesh as never);
          applyDraw(i);
        });
        if (pending) startClip(groups, pending);
        pending = null;
      })
      .catch(err => console.warn('[effects] summon failed', opts.model, err));
  }

  const t0 = fxNow();
  return live.push({
    update() {
      const t = (fxNow() - t0) / TICK;
      if (t * TICK >= opts.seconds || opts.until?.()) return false;
      if (opts.drive?.(body, t) === false) return false;
      node.position.copyFrom(body.at);
      node.rotation.y = body.yaw;
      const vis = Math.max(0, Math.min(1, body.alpha));
      if (vis < 0.99 !== fading) {
        fading = vis < 0.99;
        for (let i = 0; i < meshes.length; i++) if (drawOf[i] === 'alpha' || drawOf[i] === 'both') meshes[i].material = fading ? faded : solid;
      }
      for (const m of meshes) m.visibility = vis;
      for (const o of overlays) if (o) o.visibility = vis;
      return true;
    },
    release() {
      disposed = true;
      for (const g of groups) g.dispose();
      for (const m of meshes) releaseEffectGlow(m);
      for (const o of overlays) if (o) releaseEffectGlow(o);
      node.dispose(false, false);
      skeleton?.dispose();
    },
  });
}

function update(_map: number, dt: number): void {
  if (scrolled.size) {
    const now = fxNow();
    for (const s of scrolled.values()) s.tex.uOffset = (now * s.rate) % 1;
  }
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const summonLayer: EffectLayer<SummonOptions, 'summon'> = {
  name: 'summon',
  update,
  reset,
  spawn,
};
