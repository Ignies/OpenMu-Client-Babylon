import {
  Matrix,
  Quaternion,
  Vector3,
  type Observer,
  type Scene,
} from '../../libs/babylon/exports';
import { PlayerAction, ServerPlayerActionType } from '../../common/objects/enum';
import {
  approachAngle,
  rotationByteOf,
  signedAngleDelta,
} from '../../common/turnAngle';
import { Store } from '../../store';
import type { Entity, ISystemFactory } from '../world';

/**
 * Head look-at-mouse + idle turn-to-mouse, from ZzzInterface.cpp:7386-7498
 * and ZzzCharacter.cpp:5504-5513 / ZzzBMD.cpp:83-96.
 *
 * - The hero's head yaw follows the cursor (clamped to ±60°), pitch follows
 *   the cursor height; it keeps doing so while leaning or sitting (only the
 *   *body* turn is suppressed then). Disabled while auto-attacking a target.
 * - Other players glance around randomly (±64° / ±16°, roughly every 32 ticks).
 * - Both are smoothed with TurnAngle2(…, FarAngle × 0.2) per tick.
 * - After ~40 idle ticks the hero's body turns to the cursor and AT_STAND1 is
 *   sent so other clients see the new facing.
 *
 * The original derives the cursor yaw with `CreateAngle(...) + 315` in its own
 * screen/yaw convention; here the yaw is solved from the camera projection
 * instead (hero + unit X / unit Z projected to screen, cursor vector expressed
 * in that basis), so it is exact for any camera.
 *
 * The bone override has to run *after* Babylon evaluated the animation groups
 * (they overwrite the head bone's rotation every frame), hence the
 * onAfterAnimationsObservable hook.
 */

const DEG = Math.PI / 180;
const HEAD_BONE = 20; // Models[MODEL_PLAYER].BoneHead (ZzzOpenData.cpp:311)
const HEAD_TURN_FRACTION = 0.2;
const HEAD_YAW_LIMIT = 60 * DEG;
const HERO_SCREEN_Y = 180; // hero anchor in the original's 640×480 space
const REFERENCE_SCREEN_H = 480;
const IDLE_TURN_SECONDS = 40 / 25;
const GLANCE_TICK_CHANCE = 1 / 32;

type HeadState = {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
};

const heads = new WeakMap<Entity, HeadState>();

function headOf(e: Entity): HeadState {
  let h = heads.get(e);
  if (!h) {
    h = { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0 };
    heads.set(e, h);
  }
  return h;
}

function isIdleStandAction(action: PlayerAction): boolean {
  return (
    (action >= PlayerAction.PLAYER_STOP_MALE &&
      action <= PlayerAction.PLAYER_STOP_RIDE_WEAPON) ||
    action === PlayerAction.PLAYER_STOP_TWO_HAND_SWORD_TWO
  );
}

function blocksBodyTurn(action: PlayerAction): boolean {
  return (
    action === PlayerAction.PLAYER_POSE1 ||
    action === PlayerAction.PLAYER_POSE_FEMALE1 ||
    action === PlayerAction.PLAYER_SIT1 ||
    action === PlayerAction.PLAYER_SIT_FEMALE1
  );
}

/** Yaw convention of transform.rot.y (moveAlongPathSystem): atan2(dz, dx) + π/2. */
function yawOf(dx: number, dz: number): number {
  return Math.atan2(dz, dx) + Math.PI / 2;
}

type CursorInfo = { yaw: number; mouseY: number; canvasH: number };

export const HeadTrackingSystem: ISystemFactory = world => {
  const scene: Scene = world.scene;
  const players = world.with('playerAnimation', 'modelObject', 'transform');

  let standTime = 0;
  let observer: Observer<Scene> | null = null;
  const tmpQ = new Quaternion();
  const wHero = new Vector3();
  const wX = new Vector3();
  const wZ = new Vector3();
  const sHero = new Vector3();
  const sX = new Vector3();
  const sZ = new Vector3();

  /** World yaw from the hero towards the cursor, or null when degenerate. */
  function cursorYaw(e: Entity): CursorInfo | null {
    const camera = scene.activeCamera;
    if (!camera) return null;
    const engine = scene.getEngine();
    const renderW = engine.getRenderWidth(true);
    const renderH = engine.getRenderHeight(true);
    const canvas = engine.getRenderingCanvas();
    const cssW = canvas?.clientWidth || renderW;
    const cssH = canvas?.clientHeight || renderH;
    const mouseX = (scene.pointerX * renderW) / cssW;
    const mouseY = (scene.pointerY * renderH) / cssH;

    const t = e.transform!;
    const mp = world.mapParent.position;
    wHero.set(
      t.pos.x + (t.posOffset?.x ?? 0) + mp.x,
      t.pos.y + (t.posOffset?.y ?? 0) + mp.y,
      t.pos.z + (t.posOffset?.z ?? 0) + mp.z
    );
    wX.copyFrom(wHero).addInPlaceFromFloats(1, 0, 0);
    wZ.copyFrom(wHero).addInPlaceFromFloats(0, 0, 1);

    const viewport = camera.viewport.toGlobal(renderW, renderH);
    const transform = scene.getTransformMatrix();
    Vector3.ProjectToRef(wHero, Matrix.IdentityReadOnly, transform, viewport, sHero);
    Vector3.ProjectToRef(wX, Matrix.IdentityReadOnly, transform, viewport, sX);
    Vector3.ProjectToRef(wZ, Matrix.IdentityReadOnly, transform, viewport, sZ);

    // Screen basis of the world X/Z axes at the hero; solve a·ex + b·ez = m.
    const exx = sX.x - sHero.x;
    const exy = sX.y - sHero.y;
    const ezx = sZ.x - sHero.x;
    const ezy = sZ.y - sHero.y;
    const mx = mouseX - sHero.x;
    const my = mouseY - sHero.y;
    const det = exx * ezy - exy * ezx;
    if (Math.abs(det) < 1e-6 || mx * mx + my * my < 4) return null;
    const a = (mx * ezy - my * ezx) / det;
    const b = (exx * my - exy * mx) / det;

    return { yaw: yawOf(a, b), mouseY, canvasH: renderH };
  }

  function applyHeadBones() {
    for (const e of players) {
      const model = e.modelObject;
      const bone = model.gltf?.skeleton?.bones[HEAD_BONE + 1];
      const node = bone?.getTransformNode();
      if (!node || !node.rotationQuaternion) continue;

      const h = heads.get(e);
      if (!h || (h.yaw === 0 && h.pitch === 0)) continue;

      // BMD::Animation: head bone X -= HeadAngle[0] (yaw), Z -= HeadAngle[1]
      // (pitch), applied on top of the clip's pose.
      Quaternion.FromEulerAnglesToRef(-h.yaw, 0, -h.pitch, tmpQ);
      node.rotationQuaternion.multiplyInPlace(tmpQ);
    }
  }

  return {
    update: dt => {
      if (!observer) {
        observer = scene.onAfterAnimationsObservable.add(applyHeadBones);
      }

      const hero = world.playerEntity;
      const ticks = dt * 25;

      for (const e of players) {
        const h = headOf(e);
        const action = e.playerAnimation.action;

        if (e === hero) {
          let lookAtMouse = true;
          if (world.attackTarget) lookAtMouse = false; // auto-attack with a target
          if (action === PlayerAction.PLAYER_DIE1 || e.dying) lookAtMouse = false;

          const cursor = lookAtMouse ? cursorYaw(e) : null;

          if (cursor) {
            // Head yaw = how far the cursor is from the body facing, ±60°.
            // Bone yaw is applied as -yaw in applyHeadBones (BMD X -= HeadAngle),
            // so the offset is negated here to turn towards the cursor.
            h.targetYaw = -signedAngleDelta(e.transform.rot.y, cursor.yaw);
            const toRef = REFERENCE_SCREEN_H / cursor.canvasH;
            h.targetPitch =
              (HERO_SCREEN_Y - Math.min(cursor.mouseY, cursor.canvasH) * toRef) *
              0.05 *
              DEG;
          } else {
            h.targetYaw = 0;
            h.targetPitch = 0;
          }

          // Idle turn-to-mouse (ZzzInterface.cpp:7474-7498).
          const moving =
            !!e.movement && (e.movement.velocity.x !== 0 || e.movement.velocity.y !== 0);
          if (
            cursor &&
            !moving &&
            isIdleStandAction(action) &&
            !blocksBodyTurn(action) &&
            !e.dying &&
            !world.attackTarget
          ) {
            standTime += dt;
            if (standTime >= IDLE_TURN_SECONDS) {
              standTime = 0;
              const wanted = cursor.yaw;
              if (rotationByteOf(e.transform.rot.y) !== rotationByteOf(wanted)) {
                e.transform.rot.y = wanted;
                if (!Store.isOffline) {
                  Store.sendAnimationRequest(
                    rotationByteOf(wanted),
                    ServerPlayerActionType.Stand1
                  );
                }
              }
            }
          } else {
            standTime = 0;
          }
        } else {
          // Other players: random glances (ZzzCharacter.cpp:5504-5510).
          if (action !== PlayerAction.PLAYER_DIE1 && Math.random() < GLANCE_TICK_CHANCE * ticks) {
            h.targetYaw = (Math.random() * 128 - 64) * DEG;
            h.targetPitch = (Math.random() * 32 - 16) * DEG;
          }
        }

        h.targetYaw = Math.max(-HEAD_YAW_LIMIT, Math.min(HEAD_YAW_LIMIT, h.targetYaw));
        h.yaw = signedAngleDelta(0, approachAngle(h.yaw, h.targetYaw, HEAD_TURN_FRACTION, dt));
        h.pitch = signedAngleDelta(0, approachAngle(h.pitch, h.targetPitch, HEAD_TURN_FRACTION, dt));
      }
    },
  };
};
