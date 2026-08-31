import { MapTileObject } from '../../common/mapTileObject';
import { HIDDEN_MESH_ALL } from '../../common/modelObject';
import { createMovableFlare, type MovableFlare } from '../../common/effectLights';
import type { TransformNode } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `Luminosity = sinf((WorldTime + (o->Angle[2] * 5)) * 0.002f) * 0.3f + 0.7f;`
 * (ZzzObject.cpp:2972). Same shape as the type 7 lamp but shallower — 0.4 to
 * 1.0 — and phased by the object's own yaw twenty times more weakly
 * (`* 5` rather than `* 100`), so the 18 glows drift apart by up to a second
 * rather than by half a minute.
 */
const RATE = 0.002;
const AMPLITUDE = 0.3;
const BASE = 0.7;
const PHASE_MS_PER_DEGREE = 5;

const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * `Vector(Luminosity / 1.7f, Luminosity, Luminosity, Light)` (:2975) — a
 * cyan-white, held here as the unit colour with the luminosity applied by
 * `setLuminosity`.
 */
const GLOW_COLOR: readonly [number, number, number] = [1 / 1.7, 1, 1];

/**
 * `Scale = Luminosity * 1.5f` (:2974). `MovableFlare` fixes a sprite's size
 * at creation and only its colour can be changed afterwards, so the sprite is
 * built at the mid-luminosity size and the pulse is carried entirely by
 * brightness. Against an additive sprite the two read almost the same; a
 * resizable flare would be a change to `effectLights`, not to this map.
 */
const FLARE_SCALE = 1.5 * BASE;

/** `b->TransformPosition(BoneTransform[2], p, Position)` (:2976). */
const BONE_PREFIX = 'bone_2_';

/**
 * Tarkan 63 (ZzzObject.cpp:2971-2977 with :4092-4094), ×18 — the pale glows
 * on the temple faces and inside the sunken arches, at scales 0.69 to 1.55.
 *
 * `MoveObject` sets `o->HiddenMesh = -2`, so `Object64.glb` is loaded,
 * animated and never drawn; `RenderObjectVisual` then hangs a `BITMAP_IMPACT`
 * sprite off bone 2 of that invisible skeleton every frame. That is why this
 * type is *not* in `TARKAN_EFFECT_ONLY_TYPES` — the effect-only path skips
 * the model load, and without the model there is no bone 2 and no position
 * for the sprite. `Object64.glb` carries exactly three bones
 * (`bone_0_Box01`, `bone_1_Bone01`, `bone_2_Bone02`) and one clip.
 *
 * Two knowing substitutions: the sprite is `Effect/flare01.OZJ` (the shared
 * flare the port's effect lights use) rather than `Object9/Impack03.jpg`,
 * because `createMovableFlare` is the only movable-sprite primitive there is;
 * and no light of any kind is registered, because the original registers
 * none — 63 calls `CreateSprite`, never `AddTerrainLight`.
 */
export class TarkanImpactGlowObject extends MapTileObject {
  #phaseMs = 0;

  #bone: TransformNode | null = null;

  #flare: MovableFlare | null = null;

  #disposed = false;

  async init(world: World, entity: Entity): Promise<void> {
    // Set before the load: `ModelObject.load` runs `applyWholeBodyHide` at
    // the end (modelObject.ts:730), so the meshes leave the render list the
    // moment they arrive instead of flashing for a frame.
    this.HiddenMesh = HIDDEN_MESH_ALL;

    // Raw map yaw in degrees; see the note in glowLampObject.ts on why this
    // comes off the entity rather than off `node.rotation`.
    this.#phaseMs =
      (entity.transform?.rot.y ?? 0) * DEGREES_PER_RADIAN * PHASE_MS_PER_DEGREE;

    await super.init(world, entity);

    const bone = this.gltf?.mesh
      .getDescendants(false)
      .find(node => node.name.startsWith(BONE_PREFIX));

    this.#bone =
      bone && 'getAbsolutePosition' in bone ? (bone as TransformNode) : null;

    const flare = await createMovableFlare(
      world.scene,
      FLARE_SCALE * this.node.scaling.x,
      GLOW_COLOR
    );

    if (!flare) return;

    if (this.#disposed) {
      flare.dispose();
      return;
    }

    this.#flare = flare;
  }

  dispose(): void {
    this.#disposed = true;
    this.#flare?.dispose();
    this.#flare = null;
    this.#bone = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const flare = this.#flare;
    if (!flare) return;

    const elapsedMs = gameTime.TotalGameTime.TotalSeconds * 1000;
    const lumi = Math.sin((elapsedMs + this.#phaseMs) * RATE) * AMPLITUDE + BASE;

    flare.setLuminosity(lumi);

    const anchor = this.#bone;

    if (anchor) {
      // The body is hidden, so Babylon never walks this branch of the graph
      // for rendering and the bone's absolute position would stay at whatever
      // the last active-mesh pass left. Forcing the recompute is what makes
      // the glow follow the clip instead of sitting at the object origin.
      anchor.computeWorldMatrix(true);

      const p = anchor.getAbsolutePosition();
      flare.moveTo(p.x, p.y, p.z);
    } else {
      const p = this.node.position;
      flare.moveTo(p.x, p.y, p.z);
    }
  }
}
