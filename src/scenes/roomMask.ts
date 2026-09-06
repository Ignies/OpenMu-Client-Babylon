import {
  GeometryBufferRenderer,
  PostProcess,
  ShaderStore,
  Texture,
  type ArcRotateCamera,
  type BaseTexture,
  type DepthRenderer,
  type Scene,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';
import type { LightingTier } from '../common/lightingQuality';
import type { RoomVolume } from '../lighting/profiles';

/**
 * The room mask (ARCHITECTURE §13 F8): the one writer of "outside the room is
 * black". One post pass on tiers >= 1 while an area with a volume is active,
 * after the haze and before the post chain, whatever the post-processing
 * option says. Per pixel the world position comes back from the shared depth
 * and is drawn iff it lies inside the room volume (the floor between the inner
 * wall faces, up to the roof underside) or the segment from the camera to it
 * crosses the wall box (the same floor, up to the wall top): that is a view
 * through a door or a window, and a solid wall would have stopped the ray.
 * The box stops at the inner faces, so a wall's outer face and its top lie
 * outside and go black with the exterior. Cards that write no depth take the
 * depth behind them, so a flame over the floor stays and a torch outside the
 * walls goes with the exterior behind it.
 *
 * The depth is the G-buffer's while the AO owns one; with the post option off
 * there is none, so the pass enables the scene depth renderer for the camera
 * and releases it when the area ends. Both store camera-space z.
 *
 * Dev seam: `?roomMask=0` never builds the pass.
 */

const SHADER = 'muRoomMask';

/** Slack under the floor for uneven ground and the terrain's own relief. */
const FLOOR_SLACK = 1.0;
/**
 * Slack past the inner wall faces for the inside test, tiles: the depth's
 * reconstruction error on a face that sits on the box, no more. The walls
 * are 0.35-0.5 thick, so their outer half and their top stay outside.
 */
const FACE_SLACK = 0.02;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  pass: PostProcess;
  /** The depth renderer this pass enabled itself, to release; null while the G-buffer serves. */
  ownDepth: DepthRenderer | null;
};

let runtime: Runtime | null = null;

let shown: RoomVolume | null = null;

const forcedOff = devQuery('roomMask') === '0';

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}FragmentShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform sampler2D depthSampler;
  uniform mat4 invView;
  uniform vec2 viewport;  // tan(fov/2) * aspect, tan(fov/2)
  uniform vec4 roomXZ;    // minX, minZ, maxX, maxZ
  uniform vec3 roomY;     // floor, wall top, roof underside

  const float FLOOR_SLACK = ${FLOOR_SLACK.toFixed(2)};
  const float FACE_SLACK = ${FACE_SLACK.toFixed(3)};

  // Segment from o to o + d against the box; true when any part is inside.
  bool crossesBox(vec3 o, vec3 d, vec3 bmin, vec3 bmax) {
    vec3 inv = 1.0 / (abs(d) + vec3(1e-6)) * sign(d + vec3(1e-9));
    vec3 t0 = (bmin - o) * inv;
    vec3 t1 = (bmax - o) * inv;
    vec3 tn = min(t0, t1);
    vec3 tf = max(t0, t1);
    float tEnter = max(max(tn.x, tn.y), tn.z);
    float tExit = min(min(tf.x, tf.y), tf.z);
    return tExit >= max(tEnter, 0.0) && tEnter <= 1.0;
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);
    float depth = texture2D(depthSampler, vUV).r;

    if (depth <= 0.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, color.a);
      return;
    }

    vec3 viewDir = vec3((vUV.x * 2.0 - 1.0) * viewport.x, (vUV.y * 2.0 - 1.0) * viewport.y, 1.0);
    vec3 camPos = invView[3].xyz;
    vec3 worldDir =
      invView[0].xyz * viewDir.x +
      invView[1].xyz * viewDir.y +
      invView[2].xyz * viewDir.z;
    vec3 toPixel = worldDir * depth;
    vec3 p = camPos + toPixel;

    vec3 volMin = vec3(roomXZ.x, roomY.x - FLOOR_SLACK, roomXZ.y);
    vec3 volMax = vec3(roomXZ.z, roomY.z, roomXZ.w);
    vec3 faceSlack = vec3(FACE_SLACK, 0.0, FACE_SLACK);
    bool inside = all(greaterThanEqual(p, volMin - faceSlack)) && all(lessThanEqual(p, volMax + faceSlack));

    vec3 wallMax = vec3(roomXZ.z, roomY.y, roomXZ.w);
    bool seenThrough = inside || crossesBox(camPos, toPixel, volMin, wallMax);

    gl_FragColor = seenThrough ? color : vec4(0.0, 0.0, 0.0, color.a);
  }
  `;
}

/** The camera-space z the frame was drawn with: the G-buffer's, else the pass's own renderer. */
function depthTexture(scene: Scene, own: DepthRenderer | null): BaseTexture | null {
  const gbuffer = scene.geometryBufferRenderer;

  if (gbuffer) {
    const index = gbuffer.getTextureIndex(GeometryBufferRenderer.DEPTH_TEXTURE_TYPE);
    return gbuffer.getGBuffer().textures[index] ?? null;
  }

  return own?.getDepthMap() ?? null;
}

function createPass(scene: Scene, camera: ArcRotateCamera): Runtime {
  registerShader();

  const ownDepth = scene.geometryBufferRenderer
    ? null
    : scene.enableDepthRenderer(camera, false, true, Texture.NEAREST_SAMPLINGMODE, true);

  const pass = new PostProcess(
    'roomMask',
    SHADER,
    ['invView', 'viewport', 'roomXZ', 'roomY'],
    ['depthSampler'],
    1,
    null,
    Texture.NEAREST_SAMPLINGMODE,
    scene.getEngine()
  );

  pass.onApply = effect => {
    const depth = depthTexture(scene, runtime?.ownDepth ?? null);
    if (!depth || !shown) return;

    effect.setTexture('depthSampler', depth);
    effect.setMatrix('invView', camera.getViewMatrix().clone().invert());

    const tanHalf = Math.tan(camera.fov / 2);
    effect.setFloat2(
      'viewport',
      tanHalf * scene.getEngine().getAspectRatio(camera, true),
      tanHalf
    );

    effect.setFloat4('roomXZ', shown.minX, shown.minY, shown.maxX, shown.maxY);
    effect.setFloat3('roomY', shown.floorY, shown.wallTop, shown.roofY);
  };

  camera.attachPostProcess(pass);

  return { scene, camera, pass, ownDepth };
}

export function disposeRoomMask(): void {
  if (!runtime) return;

  const { scene, camera, pass, ownDepth } = runtime;

  camera.detachPostProcess(pass);
  pass.dispose(camera);
  if (ownDepth) scene.disableDepthRenderer(camera);

  runtime = null;
}

/**
 * Build or tear down the pass to match the tier and the active room. Returns
 * whether the chain changed (the director re-orders the post chain) and
 * whether the pass is live. `upstreamChanged` says the AO or the haze were
 * rebuilt this tick: the pass then re-attaches to stay behind them, and swaps
 * its depth source when the G-buffer came or went.
 */
export function syncRoomMask(
  scene: Scene,
  camera: ArcRotateCamera,
  tier: LightingTier | null,
  volume: RoomVolume | null,
  upstreamChanged: boolean
): { changed: boolean; live: boolean } {
  shown = volume;

  const want = tier !== null && volume !== null && !forcedOff;

  if (runtime && (!want || runtime.scene !== scene || runtime.camera !== camera)) {
    disposeRoomMask();
    if (!want) return { changed: true, live: false };
  }

  if (runtime && upstreamChanged) {
    disposeRoomMask();
  }

  if (!want) return { changed: false, live: false };
  if (runtime) return { changed: false, live: true };

  runtime = createPass(scene, camera);

  return { changed: true, live: true };
}

export function roomMaskActive(): boolean {
  return runtime !== null;
}
