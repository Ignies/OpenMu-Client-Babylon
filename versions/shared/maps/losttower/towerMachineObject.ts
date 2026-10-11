import {
  createMovableFlare,
  type FlareTexture,
  type MovableFlare,
} from '@/controllers/lighting/effectLights';
import { MapTileObject } from '@/controllers/terrain/mapTileObject';
import { Ecs } from '@/ecs/current';
import type { BonedEmission } from '@/controllers/fx/effectParticles';
import type { Entity, World } from '@/ecs/world';
import { reportLoadFailure } from '@/controllers/assets';
import { visualLuminosity, visualTurn } from './visualRoll';

type BoneNode = BonedEmission['node'];

/**
 * `b->TransformPosition(BoneTransform[N], p, Position)` for N = 15, 19, 21
 * (ZzzObject.cpp:2903-2912), with the sprite scale each one is drawn at - no
 * `* o->Scale`.
 *
 * The bone names in Object5/Object20.glb confirm the choice was deliberate:
 * bone 15 is `light02`, bone 19 is `light01` and bone 21 is `Bone01`, the
 * mount point at the machine's core - the two small emitters and the big one.
 */
const EMITTER_BONES: readonly { bone: number; scale: number }[] = [
  { bone: 15, scale: 0.3 },
  { bone: 19, scale: 0.3 },
  { bone: 21, scale: 1.5 },
];

/** `Vector(Luminosity * 1.f, Luminosity * 0.2f, Luminosity * 0.f, Light)` (ZzzObject.cpp:2895). */
const RED_LIGHT: readonly [number, number, number] = [1, 0.2, 0];

/** `Vector(Luminosity * 0.4f, Luminosity * 0.8f, Luminosity * 1.f, Light)` (ZzzObject.cpp:2900). */
const BLUE_LIGHT: readonly [number, number, number] = [0.4, 0.8, 1];

/** Type 19 is the red machine on `BITMAP_MAGIC + 1`, 20 the blue one on `BITMAP_LIGHTNING + 1` (ZzzObject.cpp:2892-2901). */
const RED_MACHINE = 19;

/** Updates to wait for the skeleton to be posed before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * The two Lost Tower machines (types 19 and 20, `Object5/Object20.glb` and
 * `Object21.glb`; n=14 and n=6 in EncTerrain5.obj). They are the same 22-bone
 * rig in two colours - the red one is powered by `BITMAP_MAGIC + 1`
 * (Magic_Ground2.jpg, a ring of rays), the blue one by `BITMAP_LIGHTNING + 1`
 * (lightning2.jpg, a cyan burst) (ZzzObject.cpp:2890-2912) - and they are the
 * only things in the tower that are unambiguously *on*.
 *
 * `MoveObject` gives them `BlendMesh = 4` and the U scroll (both tabled
 * elsewhere); this class is the `RenderObjectVisual` half, which the tables
 * cannot express because the sprites hang off bones and re-roll their
 * brightness every frame. Each bone gets *two* sprites, at `+Rotation` and
 * `-Rotation`: the two copies of the sheet turning against each other are the
 * shimmer.
 *
 * Not reproduced:
 *
 *  - `Draw_RenderObject` (ZzzObject.cpp:1013-1022) additionally redraws the
 *    body with `StreamMesh = 2`, `BITMAP_CHROME` and `BodyLight` forced to
 *    (1.0, 0.2, 0.1), then lays the normal textured pass over it. The clone
 *    has no per-object chrome pass; that is materials work. The `stream`
 *    half of it - unlit, UV-scrolled - is already handled by
 *    the render.meshAnimations rows.
 *
 * The floor light these throw is in spec.ts: `addTerrainLight` is an x/z
 * footprint and the bones sit straight above the object origin, so anchoring
 * it would move it nowhere the terrain could see.
 */
export class LostTowerMachineObject extends MapTileObject {
  #bones: { node: BoneNode; flares: MovableFlare[]; scale: number }[] = [];
  #color: readonly [number, number, number] = RED_LIGHT;
  #sheet: FlareTexture = 'magic1';
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    const red = this.Type === RED_MACHINE;
    this.#color = red ? RED_LIGHT : BLUE_LIGHT;
    this.#sheet = red ? 'magic1' : 'lightning1';

    const root = this.gltf?.mesh;
    if (!root) return;

    const byBone = new Map<number, BoneNode>();

    for (const bone of this.gltf?.skeleton?.bones ?? []) {
      const node = bone.getTransformNode();
      const match = node && /^bone_(\d+)_/.exec(node.name);

      if (match) byBone.set(Number(match[1]), node);
    }

    // Not every skeleton hands its bones a linked transform node; walking the
    // node graph by name is the same lookup MapTileObject's chandelier fire
    // uses, and it is what the converter guarantees (`bone_<i>_<bmdName>`,
    // tools/bmdToGlb.ts:283).
    if (byBone.size === 0) {
      for (const node of root.getDescendants(false)) {
        const match = /^bone_(\d+)_/.exec(node.name);

        if (match && 'getAbsolutePosition' in node) {
          byBone.set(Number(match[1]), node as BoneNode);
        }
      }
    }

    for (const { bone, scale } of EMITTER_BONES) {
      const node = byBone.get(bone);
      if (!node) continue;

      this.#bones.push({ node, flares: [], scale });
    }
  }

  /**
   * BMD bone transforms only exist once a render has posed the skeleton, so
   * the flares are created from `Update` the first time a bone has left the
   * object origin - otherwise all three would spawn stacked at the machine's
   * feet and stay there for a frame.
   */
  #posed(): boolean {
    const origin = this.node.getAbsolutePosition();

    for (const { node } of this.#bones) {
      const p = node.getAbsolutePosition();

      if (
        Math.abs(p.x - origin.x) > 1e-3 ||
        Math.abs(p.y - origin.y) > 1e-3 ||
        Math.abs(p.z - origin.z) > 1e-3
      ) {
        return true;
      }
    }

    return false;
  }

  #light(world: World): void {
    this.#lit = true;

    for (const emitter of this.#bones) {
      // The `+Rotation` copy, then the `-Rotation` one.
      for (let i = 0; i < 2; i++) {
        void createMovableFlare(
          world.scene,
          emitter.scale,
          this.#color,
          this.#sheet
        ).then(flare => {
          if (!flare) return;

          if (this.#disposed) {
            flare.dispose();
            return;
          }

          const p = emitter.node.getAbsolutePosition();
          flare.moveTo(p.x, p.y, p.z);

          emitter.flares.push(flare);
        }).catch(reportLoadFailure('effect light flare'));
      }
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const emitter of this.#bones) {
      for (const flare of emitter.flares) flare.dispose();
    }
    this.#bones = [];

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.#bones.length === 0) return;

    const world = Ecs.world;
    if (!world) return;

    if (!this.#lit) {
      if (this.#posed() || ++this.#waited >= POSE_WAIT_LIMIT) this.#light(world);
      return;
    }

    if (this.OutOfView) return;

    // `RenderObjectVisual` re-rolls Luminosity per object per frame, and every
    // sprite it creates that frame shares the roll - so the three emitters
    // pulse together rather than sparkling independently. One roll here, then.
    const lumi = visualLuminosity();
    const rotation = visualTurn(gameTime.TotalGameTime.TotalSeconds * 1000);

    for (const emitter of this.#bones) {
      const p = emitter.node.getAbsolutePosition();
      const { flares } = emitter;

      for (let i = 0; i < flares.length; i++) {
        flares[i].moveTo(p.x, p.y, p.z);
        flares[i].setLuminosity(lumi);
        flares[i].setAngle(i === 0 ? rotation : -rotation);
      }
    }
  }
}
