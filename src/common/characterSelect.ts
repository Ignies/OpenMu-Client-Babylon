import { Vector3 } from '../libs/babylon/exports';
import { toRadians } from './utils';

const MU_SCALE = 100;

function fromMu(x: number, y: number, z: number): Vector3 {
  return new Vector3(x / MU_SCALE, z / MU_SCALE, y / MU_SCALE);
}

export const CHARACTER_SLOTS = [
  { x: 8008, y: 18885, angle: 115 },
  { x: 7986, y: 19145, angle: 90 },
  { x: 8046, y: 19400, angle: 75 },
  { x: 8133, y: 19645, angle: 60 },
  { x: 8282, y: 19845, angle: 35 },
] as const;

export const CHARACTER_HEIGHT = 169.5 / MU_SCALE;

export function characterSlotPosition(slot: number): Vector3 | null {
  const entry = CHARACTER_SLOTS[slot];
  if (!entry) return null;

  return fromMu(entry.x, entry.y, 169.5);
}

export function characterSlotAngle(slot: number): number {
  return toRadians(CHARACTER_SLOTS[slot]?.angle ?? 0);
}

export const CHARACTER_CAMERA_POSITION = fromMu(9758.93, 18913.11, 675.5);

const CAMERA_PITCH = -84.5;
const CAMERA_YAW = -75;

function cameraForward(): Vector3 {
  const pitch = toRadians(CAMERA_PITCH);
  const yaw = toRadians(CAMERA_YAW);

  const muX = -Math.sin(pitch) * Math.sin(yaw);
  const muY = -Math.sin(pitch) * Math.cos(yaw);
  const muZ = -Math.cos(pitch);

  return new Vector3(muX, muZ, muY).normalize();
}

export const CHARACTER_CAMERA_FORWARD = cameraForward();

export function characterCameraTarget(): Vector3 {
  const centre = Vector3.Zero();

  for (let slot = 0; slot < CHARACTER_SLOTS.length; slot++) {
    centre.addInPlace(characterSlotPosition(slot)!);
  }

  centre.scaleInPlace(1 / CHARACTER_SLOTS.length);

  const distance = Vector3.Dot(
    centre.subtract(CHARACTER_CAMERA_POSITION),
    CHARACTER_CAMERA_FORWARD
  );

  return CHARACTER_CAMERA_POSITION.add(
    CHARACTER_CAMERA_FORWARD.scale(distance)
  );
}
