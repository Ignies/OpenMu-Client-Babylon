import { createEffectLight, type EffectLight } from '../../common/effectLights';
import { MapTileObject } from '../../common/mapTileObject';
import { lightMapObject } from '../../lighting/mapObjectLights';
import type { LightSource } from '../../lighting/lightSource';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import { findBone, type BoneNode } from './bones';
import { EMPIRE_GUARDIAN_4_WALL_TORCH } from './spec';

/** `b->TransformPosition(BoneTransform[1], p, Position)` (GMEmpireGuardian4.cpp:867). */
const FLAME_BONE = 1;

/** Updates to wait for a posed skeleton before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * Day 4's wall torch, type 37 (`Object73/Object38.glb`, `sos_bob02.smd`,
 * 5 bones, x20 in EncTerrain73.obj).
 *
 * `RenderObjectVisual` case 37 (GMEmpireGuardian4.cpp:864-875) puts one
 * `BITMAP_FLARE` sprite on bone 1 and nothing else - no particles, no
 * `AddTerrainLight`. The bright second mesh is the model's own `songbob_R`
 * texture and needs nothing here (`RenderMesh(1, RENDER_TEXTURE |
 * RENDER_BRIGHT)`, GMEmpireGuardian1.cpp:1341-1348).
 *
 * `common/mapTileObject.ts` already does this for the login scene and only
 * there (`this.WorldIndex === WD_73NEW_LOGIN_SCENE`), so day 4's twenty
 * torches were dark. This is the same lookup with the pose wait the login
 * scene's copy is missing: BMD bone transforms only exist once a render has
 * posed the skeleton, so a flare created before that sits at the torch's
 * mounting bracket instead of in its bowl.
 */
export class EmpireGuardian4WallTorchObject extends MapTileObject {
  static Batchable = false;

  #bone: BoneNode | null = null;
  #flare: EffectLight | null = null;
  #source: LightSource | null = null;
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    this.#bone = findBone(this, FLAME_BONE);
  }

  #posed(): boolean {
    const bone = this.#bone;
    if (!bone) return false;

    const origin = this.node.getAbsolutePosition();
    const p = bone.getAbsolutePosition();

    return (
      Math.abs(p.x - origin.x) > 1e-3 ||
      Math.abs(p.y - origin.y) > 1e-3 ||
      Math.abs(p.z - origin.z) > 1e-3
    );
  }

  #light(world: World): void {
    this.#lit = true;

    const bone = this.#bone;
    if (!bone) return;

    const p = bone.getAbsolutePosition();
    const position = { x: p.x, y: p.y, z: p.z };
    const scale = this.node.scaling.x;

    this.#source = lightMapObject(
      world.scene,
      EMPIRE_GUARDIAN_4_WALL_TORCH,
      position
    );

    const sprite = EMPIRE_GUARDIAN_4_WALL_TORCH.sprite;
    if (!sprite) return;

    void createEffectLight(world.scene, sprite, position, scale).then(flare => {
      if (!flare) return;

      if (this.#disposed) flare.dispose();
      else this.#flare = flare;
    });
  }

  dispose(): void {
    this.#disposed = true;

    this.#flare?.dispose();
    this.#flare = null;

    this.#source?.dispose();
    this.#source = null;

    this.#bone = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (this.#lit || !this.Ready || !this.#bone) return;

    const world = Store.world;
    if (!world) return;

    if (this.#posed() || ++this.#waited >= POSE_WAIT_LIMIT) this.#light(world);
  }
}
