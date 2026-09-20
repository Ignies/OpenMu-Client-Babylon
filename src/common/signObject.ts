import type { Entity, World } from '../ecs/world';
import { MapTileObject } from './mapTileObject';
import { ModelObject } from './modelObject';
import { MODEL_SIGN01 } from './objects/enum';
import { textureSourceName } from './pbrMaps';
import { isSignPlate, labelledPlate } from './signPlates';
import { signLabel } from './signLabels';
import { onLanguageChanged } from '../i18n';
import type { Mesh, Texture } from '../libs/babylon/exports';

/**
 * A signpost that says something.
 *
 * The model, the placement and the material are the map's own — the only
 * thing this adds is the texture swap: the board's plate is replaced by a
 * copy with the map's or the building's name written across it
 * (`signPlates.ts`), bound per mesh through `metadata.diffuseTexture` so two
 * signs sharing a model can read differently.
 *
 * Bound to its types in each map's `create.ts`, the way `OperateBoxObject`
 * is. A placement with no row in `signLabels.ts` runs the plain object.
 */
export class SignObject extends MapTileObject {
  // Each placement binds its own plate (metadata.diffuseTexture), and a thin-
  // instance batch has one material for the lot — two signs a tile apart
  // would read the same. 80 signs in the whole game stay on the per-object
  // path; nothing else in propBatches.ts changes.
  static Batchable = false;

  #stopListening: (() => void) | null = null;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#stopListening = labelSign(this, world);
  }

  dispose() {
    this.#stopListening?.();
    this.#stopListening = null;
    super.dispose();
  }
}

/**
 * Lorencia's two boards are `Sign01.glb` / `Sign02.glb`, not the numbered
 * `Object<n>.glb` every other map uses (MapManager.cpp:1069), so they load
 * through `ModelObject` rather than `MapTileObject`.
 */
export class LorenciaSignObject extends ModelObject {
  /** As above: a batched sign cannot carry its own plate. */
  static Batchable = false;

  #stopListening: (() => void) | null = null;

  async init(world: World) {
    await this.loadSpecificModelWithDynamicID(MODEL_SIGN01, 'Sign');

    this.#stopListening = labelSign(this, world);
  }

  dispose() {
    this.#stopListening?.();
    this.#stopListening = null;
    super.dispose();
  }
}

/**
 * Which texture carries the board, for the models that use two plates.
 *
 * Nearly every signpost has one plate texture and one mesh drawing it, so the
 * board is simply "the mesh with a plate on it". Devias' two-plank road sign
 * is the exception: its plank is `snotice02` and its **post** is `snotice` —
 * and the post is UV-mapped straight across the rows the plaque's title sits
 * on, so labelling it would paint the name down the post rather than on the
 * board. Keyed `<world>:<type>`.
 */
const BOARD_PLATE: Record<string, string> = {
  '2:58': 'snotice02',
  '2:59': 'snotice02',
};

/**
 * Writes this placement's name onto every board the model shows, and keeps
 * doing it when the language changes. Returns the unsubscribe.
 */
function labelSign(object: ModelObject, world: World): (() => void) | null {
  // loadMapIntoScene puts tile X in `x` and tile Y in `z`.
  const position = object.node.position;
  const type = object.Type;
  const map = object.WorldIndex;

  const boards = signBoards(object, map, type);

  if (boards.length === 0) return null;

  const paint = () => {
    const label = signLabel(map, type, position.x, position.z);
    if (!label) return;

    for (const { mesh, key } of boards) {
      labelledPlate(world.scene, key, label).then(plate => {
        // The model can be torn down while the plate decodes.
        if (!plate || mesh.isDisposed()) return;
        (mesh.metadata ??= {}).diffuseTexture = plate;
      });
    }
  };

  paint();

  return onLanguageChanged(paint);
}

/** The meshes of `object` that draw its board, and on which plate. */
function signBoards(
  object: ModelObject,
  map: number,
  type: number
): { mesh: Mesh; key: string }[] {
  const dir = object.objectDir;
  const only = BOARD_PLATE[`${map}:${type}`];
  const boards: { mesh: Mesh; key: string }[] = [];

  for (const mesh of object.getMeshes(true)) {
    const texture = mesh.metadata?.diffuseTexture as Texture | undefined;
    if (!texture) continue;

    const name = textureSourceName(texture);
    if (only && name.toLowerCase() !== only) continue;

    const key = `${dir}${name}`;
    if (!isSignPlate(key)) continue;

    boards.push({ mesh, key });
  }

  return boards;
}
