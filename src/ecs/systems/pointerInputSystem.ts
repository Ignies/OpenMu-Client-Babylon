import {
  Color3,
  Matrix,
  PointerEventTypes,
  Ray,
  Vector3,
} from '../../libs/babylon/exports';
import type { EntityTypeFromQuery, ISystemFactory } from '../world';
import { isAttackableEntity } from './attackSystem';
import { Commands } from '../../commands';

const COLOR_RED = new Color3(1, 0, 0);

// `CheckMouseIn` on a character in the original tests the model's
// BoundingBox, but the boxes it ships are generous (whole-model bind pose
// with the weapon), so a click near a body still selects it. Our boxes come
// from the mesh bounds and are tight, so they are padded here, in tiles: a
// third of a tile around the feet, a little over the head, and every
// selectable stands at least a character tall — a kneeling smith or a short
// NPC is still a full click target.
const PICK_PAD_XZ = 0.35;
const PICK_PAD_TOP = 0.15;
const PICK_MIN_HEIGHT = 1.6;

/** Hover re-sample interval (s); the click itself always re-samples. */
const HOVER_INTERVAL = 0.05;

export const PointerInputSystem: ISystemFactory = world => {
  const scene = world.scene;

  const tmpCameraRay = new Ray(Vector3.Zero(), Vector3.Up(), Number.MAX_VALUE);
  const identity = Matrix.Identity();

  const query = world.with(
    'modelObject',
    'visibility',
    'transform',
    'interactable'
  );

  type Selectable = EntityTypeFromQuery<typeof query>;

  const paddedMin = new Vector3();
  const paddedMax = new Vector3();
  const centre = new Vector3();

  /** The selectable under `tmpCameraRay`, nearest to the camera first. */
  function resolveTarget(): Selectable | null {
    let best: Selectable | null = null;
    let bestDistance = Number.MAX_VALUE;

    for (const e of query) {
      const { modelObject, visibility, attributeSystem } = e;

      if (!modelObject.Ready) continue;
      if (!attributeSystem) continue;
      if (visibility.state === 'hidden') continue;
      if (e.dying) continue; // corpses are neither selectable nor show a name/HP bar

      modelObject.UpdateBoundings();
      const bb = modelObject.BoundingBoxLocal;
      if (bb.minimumWorld.x > bb.maximumWorld.x) {
        // Degenerate box (a model whose GLB carries no meshes — e.g. a
        // bones-only conversion): fall back to a body-sized box on the
        // entity position so the NPC stays clickable.
        const pos = e.transform.pos;
        paddedMin.set(pos.x, pos.y, pos.z);
        paddedMax.set(pos.x, pos.y + PICK_MIN_HEIGHT, pos.z);
      } else {
        paddedMin.copyFrom(bb.minimumWorld);
        paddedMax.copyFrom(bb.maximumWorld);
      }
      paddedMin.x -= PICK_PAD_XZ;
      paddedMin.z -= PICK_PAD_XZ;
      paddedMax.x += PICK_PAD_XZ;
      paddedMax.z += PICK_PAD_XZ;
      paddedMax.y += PICK_PAD_TOP;
      if (paddedMax.y - paddedMin.y < PICK_MIN_HEIGHT) {
        paddedMax.y = paddedMin.y + PICK_MIN_HEIGHT;
      }

      if (!tmpCameraRay.intersectsBoxMinMax(paddedMin, paddedMax)) continue;

      paddedMin.addToRef(paddedMax, centre).scaleInPlace(0.5);
      const distance = Vector3.DistanceSquared(tmpCameraRay.origin, centre);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = e;
      }
    }

    return best;
  }

  function applyTarget(target: Selectable | null): void {
    const oldTarget = world.currentPointerTarget;
    world.currentPointerTarget = target;

    if (oldTarget !== target && oldTarget && oldTarget.highlighted) {
      world.removeComponent(oldTarget, 'highlighted');
    }

    if (target && !target.highlighted) {
      world.addComponent(target, 'highlighted', {
        color: COLOR_RED,
        layer: null,
      });
    }
  }

  scene.onPointerObservable.add(ev => {
    // Only the ray is wanted here — the hovered object is resolved by
    // testing it against each candidate's own box. `scene.pick` would
    // ray-intersect every pickable mesh in the scene (the terrain's 131k
    // triangles included) on every pointer event, move events included.
    scene.createPickingRayToRef(
      ev.event.clientX,
      ev.event.clientY,
      identity,
      tmpCameraRay,
      null
    );

    // The click re-resolves against its own ray: the hover sample can be up
    // to HOVER_INTERVAL old, and the systems registered after this one
    // (talk, rest objects, movement) read `currentPointerTarget` in their
    // own pointer-down handlers.
    if (ev.type === PointerEventTypes.POINTERDOWN) applyTarget(resolveTarget());

    if (ev.event.button === 2) {
      // `CNewUICommandWindow::RunCommand`: with an entry armed the right
      // click runs it on the player under the cursor instead of casting.
      if (
        ev.type === PointerEventTypes.POINTERDOWN &&
        Commands.runPendingOn(world.currentPointerTarget)
      ) {
        return;
      }
      // Right button: skill use (Attack() with MouseRButton). Re-picked on
      // every move while held so the cast follows the cursor.
      if (ev.type === PointerEventTypes.POINTERDOWN) world.rightPointerPressed = true;
      else if (ev.type === PointerEventTypes.POINTERUP) world.rightPointerPressed = false;
      if (ev.type === PointerEventTypes.POINTERDOWN || (ev.type === PointerEventTypes.POINTERMOVE && world.rightPointerPressed)) {
        const ground = scene.pick(
          ev.event.clientX,
          ev.event.clientY,
          m => m === world.terrain?.mesh,
          true
        ).pickedPoint;
        // Ctrl + right button: the skill goes at the cursor's ground point
        // and ignores the object under it - a way to aim an area skill past
        // a friendly player or a merchant standing in the line of fire.
        const forced = ev.event.ctrlKey;
        world.castRequest = {
          target: forced ? null : world.currentPointerTarget,
          point: ground ? { x: ground.x, y: ground.z } : null,
          forced,
        };
      }
      return;
    }

    // Left button only: the middle button belongs to the camera (drag
    // rotate) and must never move or attack.
    if (ev.event.button !== 0) return;

    if (ev.type === PointerEventTypes.POINTERDOWN) {
      world.pointerPressed = true;

      const target = world.currentPointerTarget;
      if (target && isAttackableEntity(world, target)) {
        world.attackTarget = target;
      }
    } else if (ev.type === PointerEventTypes.POINTERUP) {
      world.pointerPressed = false;
    }
  });

  window.addEventListener('lostpointercapture', () => {
    world.pointerPressed = false;
    world.rightPointerPressed = false;
  });

  scene
    .getEngine()
    .getRenderingCanvas()
    ?.addEventListener('contextmenu', e => e.preventDefault());

  let delay = 0;

  return {
    update: dt => {
      delay -= dt;
      if (delay > 0) return;
      delay = HOVER_INTERVAL;

      applyTarget(resolveTarget());
    },
  };
};
