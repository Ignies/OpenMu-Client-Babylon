import {
  Color3,
  Matrix,
  PointerEventTypes,
  Ray,
  Vector3,
} from '../../libs/babylon/exports';
import type { EntityTypeFromQuery, ISystemFactory } from '../world';
import { isAttackableEntity, isOtherPlayer } from './attackSystem';
import { isMobileDevice } from '../../common/mobile';
import { Commands } from '../../commands';
import { aimX, aimY } from '../../camera';

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

  let lastClientX = 0;
  let lastClientY = 0;

  /**
   * Point `tmpCameraRay` where the player is aiming. `aimX/aimY`: the
   * first-person look holds the pointer lock, which freezes
   * `clientX/clientY` where it was taken, so the aim is the crosshair.
   */
  function aimRay(): void {
    scene.createPickingRayToRef(
      aimX(lastClientX),
      aimY(lastClientY),
      identity,
      tmpCameraRay,
      null
    );
  }

  /**
   * The selectable under `tmpCameraRay`, nearest to the camera first.
   *
   * Bodies (players, monsters, NPCs) win over drops: the original's pick
   * pass runs `SelectCharacter` for characters and monsters, then NPCs, and
   * only asks `SelectItem` when both came back empty (ZzzInterface.cpp
   * :8117-8130), so a monster standing on a pile of loot is the click target
   * and not the loot. Holding Alt flips the order — items first, then NPCs,
   * then monsters (:8048-8058) — which is how loot under a monster is still
   * reachable. Without that rule a drop's padded box (every selectable is
   * at least a character tall) could steal the click from the monster on
   * top of it and turn an attack into a walk-to-pick-up under its blows.
   */
  function resolveTarget(): Selectable | null {
    let best: Selectable | null = null;
    let bestDistance = Number.MAX_VALUE;
    let bestDrop: Selectable | null = null;
    let bestDropDistance = Number.MAX_VALUE;

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
      if (e.droppedItem) {
        if (distance < bestDropDistance) {
          bestDropDistance = distance;
          bestDrop = e;
        }
      } else if (distance < bestDistance) {
        bestDistance = distance;
        best = e;
      }
    }

    const keys = world.keyboardInput.pressedKeys;
    const itemsFirst = keys.has('AltLeft') || keys.has('AltRight');
    return itemsFirst ? (bestDrop ?? best) : (best ?? bestDrop);
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
    lastClientX = ev.event.clientX;
    lastClientY = ev.event.clientY;
    aimRay();

    // The click re-resolves against its own ray: the hover sample can be up
    // to HOVER_INTERVAL old, and the systems registered after this one
    // (talk, rest objects, movement) read `currentPointerTarget` in their
    // own pointer-down handlers.
    if (ev.type === PointerEventTypes.POINTERDOWN) applyTarget(resolveTarget());

    // A move event reports button -1, so a right-button drag is recognised
    // by the held state, not by the button field.
    const rightDrag =
      ev.type === PointerEventTypes.POINTERMOVE && world.rightPointerPressed;

    if (ev.event.button === 2 || rightDrag) {
      // `CNewUICommandWindow::RunCommand`: with an entry armed the right
      // click runs it on the player under the cursor instead of casting.
      if (
        ev.type === PointerEventTypes.POINTERDOWN &&
        Commands.runPendingOn(world.currentPointerTarget)
      ) {
        return;
      }
      // `CNewUIHotKey::UpdateMouseEvent`: on another player the right click
      // opens the quick command menu at the cursor instead of casting. Ctrl
      // is the force-cast modifier below, so it still aims past the player.
      if (
        ev.type === PointerEventTypes.POINTERDOWN &&
        !ev.event.ctrlKey &&
        Commands.openQuickOn(
          world.currentPointerTarget,
          ev.event.clientX,
          ev.event.clientY
        )
      ) {
        return;
      }
      // Right button: skill use (Attack() with MouseRButton). Re-picked on
      // every move while held so the cast follows the cursor.
      if (ev.type === PointerEventTypes.POINTERDOWN) world.rightPointerPressed = true;
      else if (ev.type === PointerEventTypes.POINTERUP) world.rightPointerPressed = false;
      if (ev.type === PointerEventTypes.POINTERDOWN || rightDrag) {
        const ground = scene.pick(
          aimX(ev.event.clientX),
          aimY(ev.event.clientY),
          m => m === world.terrain?.mesh,
          true
        ).pickedPoint;
        // Ctrl + right button is `CheckAttack`'s force attack
        // (ZzzInterface.cpp:1778). Over another player it is the whole
        // reason they are a target - without it the cast refuses them, so
        // a right click in a crowd never opens fire on a passer-by. Over
        // anything else it drops the object under the cursor and casts at
        // the ground point, to aim an area skill past a merchant standing
        // in the line of fire.
        const hovered = world.currentPointerTarget ?? null;
        const pvp = ev.event.ctrlKey && !!hovered && isOtherPlayer(hovered);
        const forced = ev.event.ctrlKey && !pvp;
        world.castRequest = {
          target: forced ? null : hovered,
          point: ground ? { x: ground.x, y: ground.z } : null,
          forced,
          pvp,
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
      // Touch only: with no cursor hovering, the ray this would re-sample is
      // just wherever the player last tapped, so a monster wandering across
      // it would steal the selection they made. The tap itself resolves the
      // target (POINTERDOWN above) and it stays until the next one.
      if (isMobileDevice()) return;

      delay -= dt;
      if (delay > 0) return;
      delay = HOVER_INTERVAL;

      // Re-aimed, not just re-tested: the camera moves without the mouse
      // (Insert/Delete, and every step of a keyboard walk), and a ray built
      // from where it used to stand hovers whatever used to be there.
      aimRay();
      applyTarget(resolveTarget());
    },
  };
};
