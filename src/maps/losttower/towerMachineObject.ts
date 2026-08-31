import {
  createMovableFlare,
  type MovableFlare,
} from '../../common/effectLights';
import { MapTileObject } from '../../common/mapTileObject';
import { Store } from '../../store';
import type { BonedEmission } from '../../common/effectParticles';
import type { Entity, World } from '../../ecs/world';

type BoneNode = BonedEmission['node'];

/**
 * `b->TransformPosition(BoneTransform[N], p, Position)` for N = 15, 19, 21
 * (ZzzObject.cpp:2907-2915), with the sprite scale each one is drawn at.
 *
 * The bone names in Object5/Object20.glb confirm the choice was deliberate:
 * bone 15 is `light02`, bone 19 is `light01` and bone 21 is `Bone01`, the
 * mount point at the machine's core — the two small emitters and the big one.
 */
const EMITTER_BONES: readonly { bone: number; scale: number }[] = [
  { bone: 15, scale: 0.3 },
  { bone: 19, scale: 0.3 },
  { bone: 21, scale: 1.5 },
];

/** `Vector(Luminosity * 1.f, Luminosity * 0.2f, Luminosity * 0.f, Light)` (ZzzObject.cpp:2900). */
const RED_LIGHT: readonly [number, number, number] = [1, 0.2, 0];

/** `Vector(Luminosity * 0.4f, Luminosity * 0.8f, Luminosity * 1.f, Light)` (ZzzObject.cpp:2904). */
const BLUE_LIGHT: readonly [number, number, number] = [0.4, 0.8, 1];

/** Type 19 is the red machine, 20 the blue one (ZzzObject.cpp:2896-2905). */
const RED_MACHINE = 19;

/** `Luminosity = (float)(rand() % 30 + 70) * 0.01f` (ZzzObject.cpp:2743). */
const LUMINOSITY_MIN = 0.7;
const LUMINOSITY_STEPS = 30;
const LUMINOSITY_STEP = 0.01;

/** Updates to wait for the skeleton to be posed before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * The two Lost Tower machines (types 19 and 20, `Object5/Object20.glb` and
 * `Object21.glb`; n=14 and n=6 in EncTerrain5.obj). They are the same 22-bone
 * rig in two colours — the red one is powered by `BITMAP_MAGIC + 1`, the blue
 * one by `BITMAP_LIGHTNING + 1` (ZzzObject.cpp:2896-2905) — and they are the
 * only things in the tower that are unambiguously *on*.
 *
 * `MoveObject` gives them `BlendMesh = 4` and the U scroll (both tabled
 * elsewhere); this class is the `RenderObjectVisual` half, which the tables
 * cannot express because the sprites hang off bones and re-roll their
 * brightness every frame.
 *
 * Two things the original does that are not reproduced, both because the
 * clone's flare is a radially symmetric disc (Effect/flare01) rather than the
 * original's directional star and bolt bitmaps:
 *
 *  - Each bone gets *two* sprites, at `+Rotation` and `-Rotation` with
 *    `Rotation = (int)(WorldTime * 0.1f) % 360`. Counter-rotating a
 *    four-pointed star against itself is how the original builds a symmetric,
 *    shimmering flare out of an asymmetric texture; on a disc the rotation is
 *    a no-op and the pair is just the same sprite drawn twice. One sprite per
 *    bone, then — doubling it would only double the additive brightness, and
 *    that is a colour decision, not a fidelity one.
 *  - `Draw_RenderObject` (ZzzObject.cpp:1013-1022) additionally redraws the
 *    body with `StreamMesh = 2`, `BITMAP_CHROME` and `BodyLight` forced to
 *    (1.0, 0.2, 0.1), then lays the normal textured pass over it. The clone
 *    has no per-object chrome pass; that is materials work. The `stream`
 *    half of it — unlit, UV-scrolled — is already handled by
 *    common/meshAnimation.ts.
 *
 * The floor light these throw is in spec.ts: `addTerrainLight` is an x/z
 * footprint and the bones sit straight above the object origin, so anchoring
 * it would move it nowhere the terrain could see.
 */
export class LostTowerMachineObject extends MapTileObject {
  #bones: { node: BoneNode; flare: MovableFlare | null; scale: number }[] = [];
  #color: readonly [number, number, number] = RED_LIGHT;
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#color = this.Type === RED_MACHINE ? RED_LIGHT : BLUE_LIGHT;

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

      this.#bones.push({ node, flare: null, scale });
    }
  }

  /**
   * BMD bone transforms only exist once a render has posed the skeleton, so
   * the flares are created from `Update` the first time a bone has left the
   * object origin — otherwise all three would spawn stacked at the machine's
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

    const objectScale = this.node.scaling.x;

    for (const emitter of this.#bones) {
      void createMovableFlare(
        world.scene,
        emitter.scale * objectScale,
        this.#color
      ).then(flare => {
        if (!flare) return;

        if (this.#disposed) {
          flare.dispose();
          return;
        }

        const p = emitter.node.getAbsolutePosition();
        flare.moveTo(p.x, p.y, p.z);

        emitter.flare = flare;
      });
    }
  }

  dispose(): void {
    this.#disposed = true;

    for (const emitter of this.#bones) emitter.flare?.dispose();
    this.#bones = [];

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.#bones.length === 0) return;

    const world = Store.world;
    if (!world) return;

    if (!this.#lit) {
      if (this.#posed() || ++this.#waited >= POSE_WAIT_LIMIT) this.#light(world);
      return;
    }

    if (this.OutOfView) return;

    // `RenderObjectVisual` re-rolls Luminosity per object per frame, and every
    // sprite it creates that frame shares the roll — so the three emitters
    // pulse together rather than sparkling independently. One roll here, then.
    const lumi =
      LUMINOSITY_MIN +
      Math.floor(Math.random() * LUMINOSITY_STEPS) * LUMINOSITY_STEP;

    for (const emitter of this.#bones) {
      const flare = emitter.flare;
      if (!flare) continue;

      const p = emitter.node.getAbsolutePosition();

      flare.moveTo(p.x, p.y, p.z);
      flare.setLuminosity(lumi);
    }
  }
}
