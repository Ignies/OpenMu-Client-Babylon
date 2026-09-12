import type { Entity, World } from '../../ecs/world';
import { Vector3 } from '../../libs/babylon/exports';
import { effects } from '../../effects';
import { TEX } from '../../effects/recipes';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';
import { TerrainDecal } from '../moveTargetEffect';
import { npcModelFile } from './npcModelTable';

/**
 * The Blood Castle archangels of Devias: Archangel (232, `BloodCastle01`)
 * and Messenger of Archangel (233, `BloodCastle02`). See
 * documentation/archangel_npcs/ARCHITECTURE.md for the original's three
 * sites and what is an addition.
 *
 * - `RenderMesh(0, RENDER_TEXTURE | RENDER_BRIGHT)` after the lit body
 *   (ZzzObject.cpp:2606): mesh 0 drawn again, additive, over itself -
 *   `BrightMesh`.
 * - The shadow silhouette leaves mesh 2 out (ZzzCharacter.cpp:8473) -
 *   `ShadowHiddenMesh`.
 * - A breathing, bluish-white `Magic_Ground2` circle 2.7 tiles wide on the
 *   ground under the NPC, additive (ZzzCharacter.cpp:8486-8498): the halo.
 * - Feathers, the reviewer's ask: the original has none here.
 */

/**
 * `RenderTerrainAlphaBitmap(BITMAP_MAGIC + 1, x, y, 2.7f, 2.7f, …)` is 2.7
 * tiles centred on the NPC. The reviewer asked for the light to reach the
 * ground the feathers drift over, in front of the angel: wider, and its
 * centre a tile ahead.
 */
const HALO_TEXTURE = TEX.magicGround2;
const HALO_SIZE = 4.5;
const HALO_AHEAD = 1;

/** `Luminosity = sinf(WorldTime * 0.0015f) * 0.3f + 0.8f`. */
const HALO_BREATHE_PER_MS = 0.0015;
const HALO_BREATHE_SWING = 0.3;
const HALO_BREATHE_BASE = 0.8;

/** Seconds between feathers, min and span. */
const FEATHER_GAP_MIN = 0.25;
const FEATHER_GAP_SPAN = 0.35;

/**
 * Where a feather lets go: across the wing span, a little ahead of the
 * body, at wing height. It then drifts the way the angel faces, so the
 * feathers cross the ground in front of it rather than hovering at it.
 */
const FEATHER_SPAN = 0.7;
const FEATHER_AHEAD_MIN = 0.1;
const FEATHER_AHEAD_SPAN = 0.6;
const FEATHER_HEIGHT_MIN = 1.5;
const FEATHER_HEIGHT_SPAN = 0.9;

/** Tiles/s the feathers are carried ahead of the angel. */
const FEATHER_DRIFT_AHEAD = 0.55;

const forward = new Vector3();
const right = new Vector3();

const tmp = new Vector3();

let haloSeq = 0;

function archangelFactory(file: string): typeof ModelObject {
  const path = npcModelFile(file);

  class Archangel extends ModelObject {
    static {
      Archangel.OverrideScale = 1;
    }

    BrightMesh = 0;
    ShadowHiddenMesh = 2;

    #world: World | null = null;
    #entity: Entity | null = null;
    #halo: TerrainDecal | null = null;
    #nextFeather = 0;

    async init(world: World, entity: Entity) {
      await super.init(world, entity);

      this.#world = world;
      this.#entity = entity;
      this.#halo = new TerrainDecal(
        world,
        `archangelHalo_${haloSeq++}`,
        HALO_TEXTURE,
        HALO_SIZE
      );

      this.load(await loadGLTF(path, world));
    }

    Update(gameTime: World['gameTime']): void {
      super.Update(gameTime);

      const world = this.#world;
      const entity = this.#entity;
      const halo = this.#halo;
      if (!this.Ready || !world || !entity || !halo) return;

      // The map's own walls: a tile nobody can walk is one the feathers
      // and the halo stop at.
      const open = (x: number, z: number) => world.isWalkable(x, z);
      const blocked = (x: number, z: number) => !world.isWalkable(x, z);

      if (this.OutOfView) {
        halo.hide();
        return;
      }

      const pos = entity.transform?.pos;
      if (!pos) return;

      const seconds = gameTime.TotalGameTime.TotalSeconds;

      const luminosity =
        Math.sin(seconds * 1000 * HALO_BREATHE_PER_MS) * HALO_BREATHE_SWING +
        HALO_BREATHE_BASE;

      // The way the angel faces, on the ground plane.
      forward.copyFrom(this.node.forward);
      forward.y = 0;
      if (forward.lengthSquared() < 1e-6) forward.set(0, 0, 1);
      forward.normalize();
      right.set(forward.z, 0, -forward.x);

      // `Vector(Luminosity * 0.5f, Luminosity * 0.5f, Luminosity, Light)`.
      // The halo drapes the ground; a wall's tiles are left dark so it does
      // not run on into the building the angel stands beside.
      halo.draw(
        world,
        pos.x + forward.x * HALO_AHEAD,
        pos.z + forward.z * HALO_AHEAD,
        HALO_SIZE,
        0,
        [luminosity * 0.5, luminosity * 0.5, luminosity],
        open
      );

      if (seconds < this.#nextFeather) return;
      this.#nextFeather = seconds + FEATHER_GAP_MIN + Math.random() * FEATHER_GAP_SPAN;

      const span = (Math.random() * 2 - 1) * FEATHER_SPAN;
      const ahead = FEATHER_AHEAD_MIN + Math.random() * FEATHER_AHEAD_SPAN;

      tmp.set(
        pos.x + right.x * span + forward.x * ahead,
        pos.y + FEATHER_HEIGHT_MIN + Math.random() * FEATHER_HEIGHT_SPAN,
        pos.z + right.z * span + forward.z * ahead
      );

      // A wing tip over a wall lets go at the body instead.
      if (!world.isWalkable(tmp.x, tmp.z)) {
        tmp.x = pos.x;
        tmp.z = pos.z;
      }

      effects.spawn('feathers', world.scene, tmp, {
        count: 1,
        blocked,
        drift: [forward.x * FEATHER_DRIFT_AHEAD, forward.z * FEATHER_DRIFT_AHEAD],
      });
    }

    dispose(): void {
      this.#halo?.dispose();
      this.#halo = null;
      super.dispose();
    }
  }

  Object.defineProperty(Archangel, 'name', { value: file });

  return Archangel;
}

// [NpcInfo(232, "Archangel")], [NpcInfo(233, "Messenger of Archangel")]
export const Archangel = archangelFactory('BloodCastle01');
export const ArchangelMessenger = archangelFactory('BloodCastle02');
