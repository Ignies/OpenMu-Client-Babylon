import {
  UniversalCamera,
  Vector3,
  Viewport,
  type Camera,
  type CustomMaterial,
} from '../../../libs/babylon/exports';
import { loadGLTF, getMaterial } from '../../../common/modelLoader';
import type { BlendState } from '../../../common/objects/enum';
import { ModelObject } from '../../../common/modelObject';
import { toRadians } from '../../../common/utils';
import type { World } from '../../../ecs/world';
import {
  CLASS_RENDER_PARAMETERS,
  DEFAULT_RENDER_PARAMETERS,
  PREVIEW_CAMERA_FOV,
  PREVIEW_CAMERA_OFFSET,
  PREVIEW_IDLE_ACTION,
  PREVIEW_INTRO_ACTION,
  PREVIEW_PLAY_SPEED,
  previewModelFile,
  type ClassRenderParameters,
} from './layout';

const PREVIEW_LAYER_MASK = 0x10000000;

const PREVIEW_ORIGIN = new Vector3(0, -100, 0);

const MU_SCALE = 100;

const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;

export type ClassPreview = {
  setClass: (classType: number) => void;
  dispose: () => void;
};

function parametersFor(classType: number): ClassRenderParameters {
  return CLASS_RENDER_PARAMETERS[classType] ?? DEFAULT_RENDER_PARAMETERS;
}

export function createClassPreview(
  world: World,
  getRect: () => DOMRect | null
): ClassPreview {
  const scene = world.scene;
  const engine = scene.getEngine();

  const worldCamera = scene.activeCamera ?? scene.defaultCamera;

  const camera = new UniversalCamera(
    'charMakePreview',
    PREVIEW_ORIGIN.clone(),
    scene
  );

  if (scene.activeCamera !== worldCamera) scene.activeCamera = worldCamera;

  camera.layerMask = PREVIEW_LAYER_MASK;
  camera.fov = toRadians(PREVIEW_CAMERA_FOV);
  camera.minZ = CAMERA_NEAR;
  camera.maxZ = CAMERA_FAR;

  camera.rotation.set(0, 0, 0);

  camera.position.set(
    PREVIEW_ORIGIN.x + PREVIEW_CAMERA_OFFSET.x / MU_SCALE,
    PREVIEW_ORIGIN.y + PREVIEW_CAMERA_OFFSET.z / MU_SCALE,
    PREVIEW_ORIGIN.z + PREVIEW_CAMERA_OFFSET.y / MU_SCALE
  );

  camera.viewport = new Viewport(0, 0, 0, 0);

  const stickyAngle = { x: 0, y: 0, z: 0 };

  const modelPosition = PREVIEW_ORIGIN.clone();
  const modelRotation = Vector3.Zero();

  let model: ModelObject | null = null;
  let currentClass = -1;

  const applyParameters = (object: ModelObject, classType: number) => {
    const params = parametersFor(classType);

    if (params.overrideAngle) {
      stickyAngle.x = params.angleX;
      stickyAngle.y = params.angleY;
      stickyAngle.z = params.angleZ;
    }

    modelRotation.set(
      -toRadians(stickyAngle.x),
      -toRadians(stickyAngle.z),
      -toRadians(stickyAngle.y)
    );

    modelPosition.set(
      PREVIEW_ORIGIN.x + params.positionOffsetX / MU_SCALE,
      PREVIEW_ORIGIN.y + params.positionOffsetZ / MU_SCALE,
      PREVIEW_ORIGIN.z
    );

    object.updateLocation(modelPosition, params.scale, modelRotation);
  };

  const setClass = (classType: number) => {
    if (classType === currentClass) return;
    currentClass = classType;

    model?.dispose();

    const object = new ModelObject(scene);
    object.CastsShadow = false;
    object.AnimationSpeed = PREVIEW_PLAY_SPEED;

    model = object;

    loadGLTF(previewModelFile(classType), world)
      .then(gltf => {
        object.load(gltf);

        if (model !== object) {
          object.dispose();
          return;
        }

        for (const mesh of gltf.mesh.getChildMeshes(false)) {
          mesh.layerMask = PREVIEW_LAYER_MASK;

          const source = mesh.material as CustomMaterial | null;

          if (source && !mesh.metadata?.brightMesh) {
            mesh.material = getMaterial(
              scene,
              source.backFaceCulling,
              source.transparencyMode ?? 0,
              source.alphaMode as BlendState,
              false,
              true
            );
          }
        }
        gltf.mesh.layerMask = PREVIEW_LAYER_MASK;

        applyParameters(object, classType);

        object.playAction(PREVIEW_INTRO_ACTION, false);

        gltf.animationGroups[PREVIEW_INTRO_ACTION]?.onAnimationGroupEndObservable.addOnce(
          () => {
            if (model !== object) return;
            object.playAction(PREVIEW_IDLE_ACTION, true);
          }
        );
      })
      .catch(error => {
        console.error(
          `Could not load the class preview for class type ${classType}:`,
          error
        );
      });
  };

  const updateViewport = (): boolean => {
    const canvas = engine.getRenderingCanvas();
    const rect = getRect();

    if (!canvas || !rect || rect.width <= 0 || rect.height <= 0) return false;

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;

    camera.viewport.x = (rect.left - bounds.left) / bounds.width;
    camera.viewport.y = 1 - (rect.bottom - bounds.top) / bounds.height;
    camera.viewport.width = rect.width / bounds.width;
    camera.viewport.height = rect.height / bounds.height;

    return true;
  };

  let cameras: Camera[] = [];

  const setCameras = (next: Camera[]) => {
    if (cameras.length === next.length && cameras[0] === next[0]) return;
    cameras = next;
    scene.activeCameras = next;
  };

  const beforeRender = scene.onBeforeRenderObservable.add(() => {
    setCameras(updateViewport() ? [worldCamera, camera] : [worldCamera]);
  });

  const afterRender = scene.onAfterRenderObservable.add(() => {
    if (scene.activeCamera !== worldCamera) scene.activeCamera = worldCamera;
  });

  const suppressed: { isEnabled: boolean }[] = [];

  const beforeCamera = scene.onBeforeCameraRenderObservable.add(active => {
    if (active !== camera) return;

    for (const layer of scene.effectLayers) {
      if (!layer.isEnabled) continue;
      layer.isEnabled = false;
      suppressed.push(layer);
    }
  });

  const afterCamera = scene.onAfterCameraRenderObservable.add(active => {
    if (active !== camera) return;

    for (const layer of suppressed) layer.isEnabled = true;
    suppressed.length = 0;
  });

  return {
    setClass,

    dispose: () => {
      scene.onBeforeRenderObservable.remove(beforeRender);
      scene.onAfterRenderObservable.remove(afterRender);
      scene.onBeforeCameraRenderObservable.remove(beforeCamera);
      scene.onAfterCameraRenderObservable.remove(afterCamera);

      for (const layer of suppressed) layer.isEnabled = true;
      suppressed.length = 0;

      scene.activeCameras = [];
      scene.activeCamera = worldCamera;

      model?.dispose();
      model = null;

      camera.dispose();
    },
  };
}
