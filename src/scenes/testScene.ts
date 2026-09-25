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
import { createLookDirector, type LookDirector } from '../lighting/director';
import { devQuery } from '../common/devSeams';

/** `?autoPick=1`: Babylon's own scene pick on every pointer down and up. */
const AUTO_POINTER_PICK = devQuery('autoPick') === '1';

export class TestScene extends Scene {
  defaultCamera: ArcRotateCamera;

  readonly hl: HighlightLayer;

  readonly look: SceneLook | undefined;

  readonly director: LookDirector;

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
      // The stroke mask renders at a quarter of screen resolution by default
      // and the stroke shader snaps any blur bleed to full intensity, so a
      // mesh only a few texels across (feet, hands) fills solid instead of
      // getting an edge. Only the hovered model renders into it - cheap.
      mainTextureRatio: 1,
    });
    // The blob shadow (objectShadow.ts) ORs its 0x80 stencil bit over the
    // soles of whoever stands on it, so the hovered mesh's 0x02 reads 0x82
    // there and the outer-glow pass (stencil != 0x02) floods the feet. Compare
    // without that bit; Babylon doesn't cache/restore the func mask itself.
    this.hl.onBeforeComposeObservable.add(() => engine.setStencilFunctionMask(0x7f));
    this.hl.onAfterComposeObservable.add(() => engine.setStencilFunctionMask(0xff));

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
    // autoClear stays on. This scene has no skybox yet - the sky *is* the
    // clear colour (the look director writes it per map) - so skipping the
    // colour clear smears the previous frame wherever the terrain does not
    // cover.
    //
    // That is also why `performancePriority = Intermediate` is not set here.
    // The enum is exactly two assignments (Babylon scene.js:105):
    // `skipPointerMovePicking = true` and `autoClear = false`. The second is
    // the bug above; the first is already a no-op, because the input manager
    // only picks on pointer-move when `_registeredActions > 0` or
    // `constantlyUpdateMeshUnderPointer` is set, and this scene registers no
    // ActionManager. It is set explicitly anyway so that adding one later
    // cannot silently turn every mouse-move into a full-scene pick.
    this.autoClear = true;
    this.skipPointerMovePicking = true;
    // Down and up still pick without these: with any pointer observer added,
    // each runs a full scene pick (131k terrain triangles) that nothing reads.
    this.skipPointerDownPicking = !AUTO_POINTER_PICK;
    this.skipPointerUpPicking = !AUTO_POINTER_PICK;

    this.clearColor = new Color4(0, 0, 0, 1);
    this.ambientColor = new Color3(1, 1, 1);

    addInspectorForScene(this);

    createKeyRig(this);

    initPointLightPool(this);

    this.look = applySceneLook(this, camera);

    // After the rig and the pool: the director writes the rig on its first
    // tick and the post chain sits behind the pool's lights.
    this.director = createLookDirector(this, camera);
  }
}
