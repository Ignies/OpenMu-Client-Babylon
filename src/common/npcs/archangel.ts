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

/** `RenderTerrainAlphaBitmap(BITMAP_MAGIC + 1, x, y, 2.7f, 2.7f, …)`. */
const HALO_TEXTURE = TEX.magicGround2;
const HALO_SIZE = 2.7;

/** `Luminosity = sinf(WorldTime * 0.0015f) * 0.3f + 0.8f`. */
const HALO_BREATHE_PER_MS = 0.0015;
const HALO_BREATHE_SWING = 0.3;
const HALO_BREATHE_BASE = 0.8;

/** Seconds between feathers, min and span. */
const FEATHER_GAP_MIN = 0.4;
const FEATHER_GAP_SPAN = 0.5;

/** Where a feather lets go: tiles about the NPC, and above its feet. */
const FEATHER_SPREAD = 0.55;
const FEATHER_HEIGHT_MIN = 1.0;
const FEATHER_HEIGHT_SPAN = 0.8;

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

      // `Vector(Luminosity * 0.5f, Luminosity * 0.5f, Luminosity, Light)`.
      halo.draw(world, pos.x, pos.z, HALO_SIZE, 0, [
        luminosity * 0.5,
        luminosity * 0.5,
        luminosity,
      ]);

      if (seconds < this.#nextFeather) return;
      this.#nextFeather = seconds + FEATHER_GAP_MIN + Math.random() * FEATHER_GAP_SPAN;

      tmp.set(
        pos.x + (Math.random() * 2 - 1) * FEATHER_SPREAD,
        pos.y + FEATHER_HEIGHT_MIN + Math.random() * FEATHER_HEIGHT_SPAN,
        pos.z + (Math.random() * 2 - 1) * FEATHER_SPREAD
      );
      effects.spawn('feathers', world.scene, tmp, { count: 1 });
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
