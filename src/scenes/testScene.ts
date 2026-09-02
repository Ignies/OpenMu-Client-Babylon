import { ArcRotateCamera, HighlightLayer } from '../libs/babylon/exports';
import {
  Color3,
  Color4,
  Engine,
  Scene,
  Vector3,
} from '../libs/babylon/exports';
import { addInspectorForScene } from '../libs/babylon/utils';
import { applySceneLook, type SceneLook } from './sceneLook';
import { initPointLightPool } from '../common/pointLightPool';
import { createKeyRig } from '../lighting/keyRig';

export class TestScene extends Scene {
  defaultCamera: ArcRotateCamera;

  readonly hl: HighlightLayer;

  readonly look: SceneLook | undefined;

  constructor(engine: Engine) {
    super(engine);

    const camera = new ArcRotateCamera(
      'ArcRotateCamera',
      -Math.PI / 4,
      Math.PI / 4.5,
      10,
      new Vector3(0, 0, 0),
      this
    );

    this.hl = new HighlightLayer('hl1', this, {
      isStroke: true,
      alphaBlendingMode: 1,
    });

    this.hl.innerGlow = false;

    camera.minZ = 0.1;
    camera.maxZ = 5000;
    camera.position.set(135, 10, 130);

this.fogEnabled = false;
    this.fogStart = 1;
    this.fogEnd = 25;

    this.defaultCamera = camera;

    // Frustum clipping on: meshes that must always draw opt in individually
    // (shadow clones, move-target effects, debug boxes).
    this.skipFrustumClipping = false;

    this.autoClearDepthAndStencil = true;
    // autoClear stays on. This scene has no skybox — the sky *is* the clear
    // colour (set per map in loadMapIntoScene) — so skipping the colour clear
    // smears the previous frame wherever the terrain does not cover.
    //
    // That is also why `performancePriority = Intermediate` is not set here
    // (todo C14). The enum is exactly two assignments (Babylon scene.js:105):
    // `skipPointerMovePicking = true` and `autoClear = false`. The second is
    // the bug above; the first is already a no-op, because the input manager
    // only picks on pointer-move when `_registeredActions > 0` or
    // `constantlyUpdateMeshUnderPointer` is set (scene.inputManager.js:635),
    // and this scene registers no ActionManager. It is set explicitly anyway
    // so that adding one later cannot silently turn every mouse-move into a
    // full-scene pick: nothing here reads `ev.pickInfo` on a move (the ray
    // consumers build their own via `createPickingRayToRef`).
    this.autoClear = true;
    this.skipPointerMovePicking = true;

    this.clearColor = new Color4(0, 0, 0, 1);
    this.ambientColor = new Color3(1, 1, 1);

    addInspectorForScene(this);

    createKeyRig(this);

    initPointLightPool(this);

    this.look = applySceneLook(this, camera);
  }
}
