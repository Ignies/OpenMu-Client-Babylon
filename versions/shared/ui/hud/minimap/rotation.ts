import { Ecs } from '@/ecs/current';

/**
 * How far the map art turns on screen, in CSS degrees (clockwise). The original turns it 45
 * degrees counter-clockwise (`Rot = 45`, NewUIMiniMap.cpp:130, through `RenderBitRotate`, which
 * works y-up: ZzzOpenglUtil.cpp:1263), the main camera's heading (`CameraAngle[2] = -45`). With
 * the art's U along tile Y and V along tile X, the turn that lines it up with the ground is the
 * ArcRotateCamera's `alpha`, so the map follows the camera when the camera control turns it.
 */
export const CLASSIC_MAP_ROTATION = -45;

export function mapRotation(): number {
  const camera = Ecs.world?.scene.activeCamera as { alpha?: unknown } | null | undefined;
  return typeof camera?.alpha === 'number' ? (camera.alpha * 180) / Math.PI : CLASSIC_MAP_ROTATION;
}

/**
 * A marker's own turn on screen, CSS degrees: its `Rotation` is absolute and counter-clockwise
 * (`RenderPointRotate`, ZzzOpenglUtil.cpp:1334), and it rides the map when the camera turns.
 */
export function markerTurn(rotation: number, map: number): number {
  return map - CLASSIC_MAP_ROTATION - rotation;
}
