import { With } from 'miniplex';
import { MapPlayerNetClassToModelClass } from '../../common/mapPlayerNetClassToModelClass';
import { getModel, loadGLTF } from '../../common/modelLoader';
import { ModelObject } from '../../common/modelObject';
import { PlayerObject } from '../../common/playerObject';
import { MapObjectLights } from '../../common/mapObjectLights';
import { blendMeshFor } from '../../common/blendMeshes';
import { toRenderAngles } from '../../common/renderAngles';
import {
  Color3,
  CreateBox,
  Mesh,
  StandardMaterial,
  type Skeleton,
  Vector3,
} from '../../libs/babylon/exports';
import { Entity, ISystemFactory, World } from '../world';

const v3Temp = { x: 0, y: 0, z: 0 };
const v3RotTemp = Vector3.Zero();

/**
 * Roughly a character's footprint in world units (the converter's
 * SCALE_MULTIPLIER makes 100 MU units = 1; a standing character is ~180).
 */
const PLACEHOLDER_WIDTH = 0.6;
const PLACEHOLDER_HEIGHT = 1.8;

let placeholderMaterial: StandardMaterial | null = null;

/**
 * Feeds `ModelObject.load()` a plain unlit box in place of the GLB that
 * failed, so the object reports `Ready`, has a bounding box, and so remains
 * hoverable / clickable. Nothing animates, which is fine: `playAction` on an
 * empty `animationGroups` list is a no-op.
 */
function attachMissingModelPlaceholder(world: World, modelObject: ModelObject) {
  if (modelObject.Ready || modelObject.gltf) return;

  const scene = world.scene;

  if (!placeholderMaterial || placeholderMaterial.getScene() !== scene) {
    placeholderMaterial = new StandardMaterial('missingModel', scene);
    placeholderMaterial.emissiveColor = new Color3(1, 0, 1);
    placeholderMaterial.disableLighting = true;
  }

  // An empty root so `getChildMeshes()`-based code (frustum test, bounds)
  // sees the box the same way it sees a converted GLB's primitives.
  const root = new Mesh('missingModel', scene);
  const box = CreateBox(
    'missingModel_box',
    {
      width: PLACEHOLDER_WIDTH,
      height: PLACEHOLDER_HEIGHT,
      depth: PLACEHOLDER_WIDTH,
    },
    scene
  );
  box.material = placeholderMaterial;
  box.isPickable = false;
  box.parent = root;

  modelObject.load({
    mesh: root,
    // No rig: every reader of `gltf.skeleton` in ModelObject is null-guarded.
    skeleton: null as unknown as Skeleton,
    animationGroups: [],
  });

  // load() zeroes the root and rotates it; lift it afterwards, in the node's
  // (yaw-only) space, so the box stands on the terrain instead of straddling it.
  root.position.y = PLACEHOLDER_HEIGHT / 2;
}

function createModelObject(
  world: World,
  entity: With<Entity, 'modelFactory' | 'worldIndex' | 'transform'>
) {
  const terrainScale = world.terrainScale;
  const transform = entity.transform;
  const modelId = entity.modelId;

  world.addComponent(
    entity,
    'modelObject',
    new entity.modelFactory(world.scene, world.mapParent)
  );

  const modelObject = entity.modelObject as any as ModelObject;
  modelObject.WorldIndex = entity.worldIndex;
  if (modelId !== undefined) {
    modelObject.Type = modelId;
    // `modelId` is set by `createObjects` and by nothing else, so it is the
    // one reliable 'this came from the map's object list' signal.
    modelObject.IsMapObject = true;
  }

  v3Temp.x = transform.pos.x;
  v3Temp.y = transform.pos.y;
  v3Temp.z = transform.pos.z;

  // Same yaw flip the render loop applies, so init()-time readers of
  // node.rotation (emitters, lights) don't see a mirrored first frame.
  modelObject.updateLocation(
    v3Temp,
    transform.scale,
    toRenderAngles(transform.rot, v3RotTemp)
  );

  modelObject.Lights = MapObjectLights.attach(world, modelObject);

  // A fresh model starts in its class's default body parts; the equipment
  // has to be re-applied even if the appearance was already consumed by a
  // previous (since disposed) model of this entity.
  if (entity.charAppearance) {
    entity.charAppearance.changed = true;
  }

  const blendMesh = blendMeshFor(modelObject.WorldIndex, modelObject.Type);

  if (blendMesh >= 0) {
    modelObject.BlendMesh = blendMesh;
  }

  if (
    'playerClass' in modelObject &&
    entity.attributeSystem?.hasAttribute('playerNetClass')
  ) {
    (modelObject as PlayerObject).playerClass = MapPlayerNetClassToModelClass(
      entity.attributeSystem.getValue('playerNetClass')
    );
  }

  const failed = (reason: unknown) => {
    console.error(
      `Could not load model for ${entity.modelFilePath ?? `id ${modelId}`}:`,
      reason
    );
    modelObject.LoadFailed = true;

    // A model that never became Ready has no bounds, so the pointer and
    // cursor systems skip it: an NPC whose GLB is missing or corrupt could
    // not be hovered, clicked or talked to at all. Stand a placeholder in so
    // the entity keeps a pickable footprint (map props are left alone — an
    // invisible rock is preferable to a magenta box).
    if (entity.modelObject === modelObject && entity.netId !== undefined) {
      attachMissingModelPlaceholder(world, modelObject);
    }
  };

  modelObject
    .init(world, entity)
    .then(() => {
      if (modelObject.gltf || modelObject.Ready) {
        return;
      }
      if (!entity.modelObject) {
        modelObject.dispose();
        return;
      }

      const modelFilePath = entity.modelFilePath;

      if (modelId != null) {
        // Deferred BMD-runtime seam : getModel() resolves a parsed
        // BMD, which is not yet the {mesh, skeleton, animationGroups} contract
        // ModelObject.load() takes. ModelsFactory is empty today, so this always
        // rejects into failed(); wire the BMD -> gltf bridge here when
        // BMDReader is revived behind the same contract.
        return getModel(modelId).then(() =>
          failed(`model id ${modelId}: BMD -> gltf bridge not implemented`)
        );
      }

      if (modelFilePath) {
        return loadGLTF(modelFilePath, world).then(gltf => {
          if (entity.modelObject) {
            entity.modelObject.load(gltf);
          }
        });
      }

      failed('no model id or file path');
    })
    .catch(failed);
}

/**
 * How many models may be instantiated per frame. After a warp several
 * hundred entities turn `visible` in the same tick; instantiating them all in
 * one frame was the 700-1000 ms frames of the review. At 24 a Noria arrival
 * (~500 in range) spreads over ~20 frames, nearest first, so the ground under
 * the hero fills in before the tree line does.
 */
const MODELS_PER_FRAME = 24;

type Pending = {
  entity: With<Entity, 'modelFactory' | 'worldIndex' | 'transform'>;
  priority: number;
};

/** `nearby` entities queue behind every `visible` one whatever their distance. */
const NEARBY_PENALTY = 1e6;

export const ModelLoaderSystem: ISystemFactory = world => {
  const query = world.with(
    'modelFactory',
    'worldIndex',
    'transform',
    'visibility'
  );

  const pending: Pending[] = [];

  return {
    update: () => {
      const terrain = world.terrain;
      if (!terrain) return;

      const hero = world.playerEntity?.transform.pos;

      pending.length = 0;

      for (const entity of query) {
        const visibility = entity.visibility;

        switch (visibility.state) {
          case 'visible':
          case 'nearby': {
            if (!entity.modelObject) {
              const pos = entity.transform.pos;
              const distance = hero
                ? (pos.x - hero.x) * (pos.x - hero.x) +
                  (pos.z - hero.z) * (pos.z - hero.z)
                : 0;
              pending.push({
                entity,
                priority:
                  visibility.state === 'nearby'
                    ? distance + NEARBY_PENALTY
                    : distance,
              });
            }
            break;
          }
          case 'hidden': {
            if (entity.modelObject) {
              entity.modelObject.dispose();
              world.removeComponent(entity, 'modelObject');
            }
            break;
          }
        }
      }

      if (pending.length === 0) return;

      if (pending.length > MODELS_PER_FRAME) {
        pending.sort((a, b) => a.priority - b.priority);
      }

      const count = Math.min(pending.length, MODELS_PER_FRAME);
      for (let i = 0; i < count; i++) {
        createModelObject(world, pending[i].entity);
      }
    },
  };
};
