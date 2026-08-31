import { downloadDataBytesBuffer } from '../../common/utils';

const CWS_SIGNATURE = 0x00535743;
const HEADER_SIZE = 8;
const WAYPOINT_SIZE = 28;

const MU_SCALE = 100;

export type CameraWaypoint = {
  x: number;
  y: number;
  height: number;
  delay: number;
  moveAccel: number;
  distanceLevel: number;
};

export function parseCameraWalkScript(
  name: string,
  buffer: Uint8Array
): CameraWaypoint[] {
  if (buffer.length < HEADER_SIZE) {
    throw new Error(`${name} is too small to be a camera walk script`);
  }

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  const signature = view.getUint32(0, true);

  if (signature !== CWS_SIGNATURE) {
    throw new Error(
      `${name} is not a camera walk script (signature 0x${signature.toString(16)})`
    );
  }

  const count = view.getUint32(4, true);
  const expected = HEADER_SIZE + count * WAYPOINT_SIZE;

  if (buffer.length < expected) {
    throw new Error(
      `${name} is truncated: ${count} waypoints need ${expected} bytes, got ${buffer.length}`
    );
  }

  const waypoints: CameraWaypoint[] = [];

  for (let i = 0; i < count; i++) {
    const o = HEADER_SIZE + i * WAYPOINT_SIZE;

    waypoints.push({
      x: view.getFloat32(o + 4, true) / MU_SCALE,
      y: view.getFloat32(o + 8, true) / MU_SCALE,
      height: view.getFloat32(o + 12, true),
      delay: view.getInt32(o + 16, true),
      moveAccel: view.getFloat32(o + 20, true),
      distanceLevel: view.getFloat32(o + 24, true),
    });
  }

  return waypoints;
}

export async function loadCameraWalkScript(
  worldNum: number
): Promise<CameraWaypoint[] | null> {
  const name = `World${worldNum}/CWScript${worldNum}.cws`;

  try {
    const buffer = await downloadDataBytesBuffer(name);

    return parseCameraWalkScript(name, buffer);
  } catch {
    return null;
  }
}
