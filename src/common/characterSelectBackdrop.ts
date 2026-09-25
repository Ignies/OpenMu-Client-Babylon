import {
  Color3,
  CreatePlane,
  Mesh,
  StandardMaterial,
  Texture,
  Vector3,
  type Scene,
} from '../libs/babylon/exports';
import {
  CHARACTER_CAMERA_FORWARD,
  CHARACTER_CAMERA_POSITION,
} from './characterSelect';

/** The painted backdrop behind the line-up, served from `public/`. */
const ART = '/backdrops/character-select.jpeg';

/**
 * How far down the line-up camera's view the backdrop stands, in tiles: past
 * the courtyard's farthest wall (~48) and the far set piece (~67), well
 * inside the camera's 5000 far plane.
 */
const DISTANCE = 90;

/** Half the 45 degree camera's view height at DISTANCE. */
const HALF_VIEW_HEIGHT = DISTANCE * Math.tan((22.5 * Math.PI) / 180);

/**
 * Oversize past an exact fit. The right-click close-up moves the camera
 * toward a character and turns it a little, which pulls the card's edges in;
 * this keeps them off screen through it.
 */
const MARGIN = 1.15;

/**
 * A painted scene standing behind the character select's walls, so the sky
 * past the set is a place instead of black. A flat card at the art's own
 * aspect, facing the camera: unlike the skyline band (a 360 degree ring that
 * would stretch a normal-aspect painting), nothing is resampled, and being
 * real geometry it draws in Classic too and the walls occlude it.
 *
 * Hidden until the texture loads, so a missing file leaves the old black.
 */
export function createCharacterSelectBackdrop(scene: Scene): { dispose(): void } {
  const texture = new Texture(ART, scene, false, true);

  const material = new StandardMaterial('charSelectBackdrop', scene);
  material.disableLighting = true;
  material.emissiveTexture = texture;
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.backFaceCulling = false;
  material.fogEnabled = false;

  const mesh = CreatePlane('charSelectBackdrop', { size: 1 }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
  mesh.setEnabled(false);

  // The camera's own up, square to its view, to slide the card along.
  const forward = CHARACTER_CAMERA_FORWARD;
  const up = Vector3.Up()
    .subtract(forward.scale(Vector3.Dot(Vector3.Up(), forward)))
    .normalize();

  // Like CSS `background-size: cover` against the screen's aspect, top
  // anchored: the art's top (the sky, the moon) always shows, and whatever
  // does not fit is cropped from the bottom, behind the walls. Refit on resize.
  const engine = scene.getEngine();
  let artAspect = 0;

  const fit = () => {
    if (!artAspect) return;

    const screenAspect = engine.getRenderWidth() / engine.getRenderHeight();
    const viewHeight = 2 * HALF_VIEW_HEIGHT;
    const width = Math.max(viewHeight * screenAspect, viewHeight * artAspect) * MARGIN;
    const height = width / artAspect;

    mesh.scaling.set(width, height, 1);
    // Centre on the view, then lower it until its top clears the view's top.
    mesh.position.copyFrom(
      CHARACTER_CAMERA_POSITION.add(forward.scale(DISTANCE)).addInPlace(
        up.scale(HALF_VIEW_HEIGHT * MARGIN - height / 2)
      )
    );
  };

  const resize = engine.onResizeObservable.add(fit);

  texture.onLoadObservable.addOnce(() => {
    const { width, height } = texture.getSize();
    artAspect = width / height;
    fit();
    mesh.setEnabled(true);
  });

  return {
    dispose() {
      engine.onResizeObservable.remove(resize);
      mesh.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
