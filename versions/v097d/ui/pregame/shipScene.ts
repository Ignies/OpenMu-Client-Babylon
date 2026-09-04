/**
 * The 0.97d pre-game backdrop: a ship at sea under the MU wordmark, the sky
 * and the water scrolling past it so the ship reads as sailing forever.
 *
 * Ported from the reference client, which still carries the scene behind
 * `if (SceneFlag == LOG_IN_SCENE || SceneFlag == CHARACTER_SCENE)` - Season 4
 * replaced the set piece with two real worlds and left the code. There is no
 * login world in the 0.97d tree (`World1`..`World12` and nothing else) and
 * none is needed: nothing here is anchored to a map, so the scene runs with
 * `world.terrain` null and owns its models and its camera itself.
 *
 * | Piece | Model | Original |
 * |---|---|---|
 * | sky | `Logo/logo01.bmd` `MODEL_LOGO` | ZzzObject.cpp:4516 scale 0.044, BlendMesh 1, unlit; :3707 scrolls V |
 * | water | `Logo/logo02.bmd` `MODEL_WAVEBYSHIP` | :4505 scale 0.8, BlendMesh 0, light 1/1/1; :3710 scrolls V |
 * | ship | `Object1/Ship01.bmd` `MODEL_SHIP` | MapManager.cpp:1045 (the Lorencia object set); :4500 scale 0.8 |
 * | wordmark | `Logo/Logo03.bmd` `MODEL_MUGAME` | :4511 scale 2.2, BlendMesh 1, unlit |
 * | sun | `Logo/Logo04.bmd` `MODEL_LOGOSUN` | :4520 scale 3, light 0.5/0.5/0.5 |
 *
 * Camera: `LoginScene.cpp:61` `WALK_PATHS`, driven by `MoveCamera` (:241)
 * through `MoveCharacterCamera(origin 0,0,0, position, angle)` at FOV 45.
 */
import type { ArcRotateCamera } from '../../../../src/libs/babylon/exports';
import { Texture, Vector3 } from '../../../../src/libs/babylon/exports';
import { ModelObject } from '../../../../src/common/modelObject';
import { loadGLTF } from '../../../../src/common/modelLoader';
import { toRadians } from '../../../../src/common/utils';
import type { World } from '../../../../src/ecs/world';
import type {
  PregamePhase,
  PregameScene,
} from '../../../../src/version/uiContract';

const MU_SCALE = 100;

/** MU is Z-up, Babylon Y-up (`common/characterSelect.ts`). */
function fromMu(x: number, y: number, z: number): Vector3 {
  return new Vector3(x / MU_SCALE, z / MU_SCALE, y / MU_SCALE);
}

/**
 * `MoveCharacterCamera`: `CameraAngle` is (pitch, _, yaw) in degrees, the
 * same convention `characterSelect.cameraForward` decodes.
 */
function forwardFromMuAngle(pitchDeg: number, yawDeg: number): Vector3 {
  const pitch = toRadians(pitchDeg);
  const yaw = toRadians(yawDeg);

  return new Vector3(
    -Math.sin(pitch) * Math.sin(yaw),
    -Math.cos(pitch),
    -Math.sin(pitch) * Math.cos(yaw)
  ).normalize();
}

/** `LoginScene.cpp:61` - position (x, y, z) then angle (x, y, z). */
const LOGIN_WAYPOINT = { pos: [0, -1000, 500], angle: [-80, 0, 0] } as const;
const LOGIN_WAYPOINT_END = { pos: [0, -1100, 500], angle: [-80, 0, 0] } as const;
const CHARACTER_WAYPOINT = {
  pos: [200, -800, 250],
  angle: [-87, 0, -10],
} as const;

/** `CameraFOV = 45.f` (LoginScene.cpp:255). */
const SCENE_FOV = toRadians(45);

/** How far along the look ray the camera's target is put. Framing only. */
const TARGET_DISTANCE = 20;

/**
 * `UpdateCameraWaypoint`: 128 ticks at the original's 25 Hz between the
 * start waypoint and the four identical targets, so the visible result is a
 * slow drift from -1000 to -1100 and then a hold.
 */
const DRIFT_SECONDS = 128 / 25;

type Piece = {
  readonly file: string;
  readonly scale: number;
  readonly light: readonly [number, number, number];
  /**
   * Where the piece sits, in MU units. The sea and the sky are authored
   * around the world origin the scene is built on; the ship, the wordmark
   * and the sun are placed. The 0.97d client's own `CreateLogInScene` is not
   * in the reference tree (Season 4 replaced it), so these three are framed
   * to the original's camera rather than copied from it.
   */
  readonly at?: readonly [number, number, number];
  /** Yaw in degrees. */
  readonly yaw?: number;
  /** Additive mesh index (`o->BlendMesh`); it is also the one that scrolls. */
  readonly blendMesh?: number;
  /** Mesh whose V coordinate scrolls (`o->BlendMeshTexCoordV`). */
  readonly scrollMesh?: number;
  /**
   * `gLoadData.OpenTexture(MODEL_LOGO + i, L"Logo\\", GL_REPEAT, GL_LINEAR)`
   * (ZzzOpenData.cpp:4883): the sky and sea quads carry UVs well outside
   * 0..1 and tile their small sheets. Clamped, they smear the edge pixel
   * into a flat wash over the whole horizon.
   */
  readonly repeat?: boolean;
  /** Drawn from inside: the sky shell needs both faces. */
  readonly doubleSided?: boolean;
  /** Drawn on the login screen only; character select is a closer framing. */
  readonly loginOnly?: boolean;
};

const PIECES: readonly Piece[] = [
  {
    file: 'Logo/logo01.glb',
    scale: 0.044,
    light: [1, 1, 1],
    scrollMesh: 1,
    repeat: true,
    doubleSided: true,
  },
  {
    file: 'Logo/logo02.glb',
    scale: 0.8,
    light: [1, 1, 1],
    scrollMesh: 0,
    repeat: true,
  },
  {
    file: 'Object1/Ship01.glb',
    scale: 0.8,
    light: [1, 1, 1],
    at: [420, 1500, -60],
    yaw: 28,
  },
  {
    file: 'Logo/Logo03.glb',
    scale: 1.5,
    light: [1, 1, 1],
    blendMesh: 1,
    at: [-560, 1560, 640],
    loginOnly: true,
  },
  {
    file: 'Logo/Logo04.glb',
    scale: 3,
    light: [0.5, 0.5, 0.5],
    blendMesh: 0,
    at: [980, 1620, 640],
  },
];

/** `BlendMeshTexCoordV = -((int)WorldTime % 4000 * 0.00025f)` (ZzzObject.cpp:3705). */
function scrollV(elapsedMs: number): number {
  return -((elapsedMs % 4000) * 0.00025);
}

const ORIGIN = { x: 0, y: 0, z: 0 };
const NO_ROTATION = { x: 0, y: 0, z: 0 };

export function createShipScene(world: World): PregameScene {
  const scene = world.scene;

  const parts: { piece: Piece; object: ModelObject }[] = [];
  /** The sheets `BlendMeshTexCoordV` runs on: the clouds and the water. */
  const scrolling: Texture[] = [];
  let disposed = false;
  let elapsedMs = 0;

  for (const piece of PIECES) {
    const object = new ModelObject(scene);

    object.CastsShadow = false;
    if (piece.blendMesh !== undefined) object.BlendMesh = piece.blendMesh;

    parts.push({ piece, object });

    void loadGLTF(piece.file, world).then(gltf => {
      if (disposed) return;

      object.load(gltf);
      object.Light.set(piece.light[0], piece.light[1], piece.light[2]);
      object.updateLocation(
        piece.at ? fromMu(piece.at[0], piece.at[1], piece.at[2]) : ORIGIN,
        piece.scale,
        piece.yaw ? { x: 0, y: toRadians(piece.yaw), z: 0 } : NO_ROTATION
      );
      object.playAction(0, true);

      for (const mesh of object.getMeshes()) {
        // The sky shell wraps the camera, so its own bounding box never
        // enters the frustum test the way a map object's does; without this
        // the horizon quads are culled and the backdrop is black.
        mesh.alwaysSelectAsActiveMesh = true;

        if (piece.doubleSided && mesh.material) {
          mesh.material.backFaceCulling = false;
        }
      }

      // The shared item materials bind `metadata.diffuseTexture` per mesh, so
      // the sheet to tile and to scroll is the mesh's own, not the material's.
      for (const mesh of object.getMeshes()) {
        const texture = mesh.metadata?.diffuseTexture as Texture | undefined;
        if (!texture) continue;

        if (piece.repeat) {
          texture.wrapU = Texture.WRAP_ADDRESSMODE;
          texture.wrapV = Texture.WRAP_ADDRESSMODE;
        }
      }

      if (piece.scrollMesh !== undefined) {
        const texture = object.getMesh(piece.scrollMesh)?.metadata
          ?.diffuseTexture as Texture | undefined;

        if (texture) scrolling.push(texture);
      }
    });
  }

  const target = new Vector3(0, 0, 0);

  return {
    update(deltaTime: number, phase: PregamePhase) {
      elapsedMs += deltaTime * 1000;

      for (const { piece, object } of parts) {
        if (!object.Ready) continue;

        object.node.setEnabled(phase === 'login' || !piece.loginOnly);
      }

      for (const texture of scrolling) texture.vOffset = scrollV(elapsedMs);

      const camera = scene.activeCamera as ArcRotateCamera;
      if (!camera) return;

      const waypoint =
        phase === 'characters'
          ? CHARACTER_WAYPOINT
          : LOGIN_WAYPOINT_END;
      const from = phase === 'characters' ? CHARACTER_WAYPOINT : LOGIN_WAYPOINT;

      const t =
        phase === 'characters'
          ? 1
          : Math.min(elapsedMs / 1000 / DRIFT_SECONDS, 1);

      const position = fromMu(
        from.pos[0] + (waypoint.pos[0] - from.pos[0]) * t,
        from.pos[1] + (waypoint.pos[1] - from.pos[1]) * t,
        from.pos[2] + (waypoint.pos[2] - from.pos[2]) * t
      );

      const forward = forwardFromMuAngle(waypoint.angle[0], waypoint.angle[2]);

      target.copyFrom(position).addInPlace(forward.scale(TARGET_DISTANCE));

      camera.fov = SCENE_FOV;
      camera.setTarget(target);
      camera.setPosition(position);
    },

    dispose() {
      disposed = true;
      scrolling.length = 0;

      for (const { object } of parts) object.dispose();

      parts.length = 0;
    },
  };
}
