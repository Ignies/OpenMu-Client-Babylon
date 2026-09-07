import {
  Constants,
  Material,
  PostProcess,
  RawTexture,
  ShaderStore,
  SmartArray,
  Texture,
  Vector3,
  type ArcRotateCamera,
  type BaseTexture,
  type DepthRenderer,
  type RenderTargetTexture,
  type Scene,
  type SubMesh,
} from '../libs/babylon/exports';
import { devQuery } from '../common/devSeams';
import { EFFECT_MASK_SAMPLER, effectMask } from './ambientOcclusion';
import type { LightingTier } from '../common/lightingQuality';
import type { RoomVolume } from '../lighting/profiles';

/**
 * The room mask (ARCHITECTURE §13 F8): the one writer of "outside the room is
 * black". One post pass on tiers >= 1 while an area with a volume is active,
 * after the haze and before the post chain, whatever the post-processing
 * option says. Per pixel the world position comes back from the shared depth
 * and is drawn iff it lies inside the room volume (the floor between the inner
 * wall faces, up to the roof underside) or the segment from the camera to it
 * leaves the wall box (the same floor, up to the wall top) through one of its
 * four sides: that is a view through a door or a window, and a solid wall
 * would have stopped the ray. The two faces that stop nothing are the roof,
 * which is lifted out of the way while the hero is inside, and the floor,
 * which is one-sided and writes no depth from below - so a ray over the wall
 * top reaches the world outside and a ray up through the ground reaches all
 * of it, and neither is an opening. Hence the two asymmetries: only the exit
 * face has to be a wall (a camera above may drop its rays in through the
 * missing roof), and a camera below the floor gets no crossing at all. The
 * box stops at the inner faces, so a wall's outer face and its top lie
 * outside and go black with the exterior. Cards that write no depth take the
 * depth behind them, so a flame over the floor stays and a torch outside the
 * walls goes with the exterior behind it.
 *
 * The depth is the pass's own renderer, enabled for the camera while a room
 * is active and released when the area ends, storing camera-space z. Not the
 * G-buffer: that one refuses a map object's alpha-keyed cards on purpose, and
 * a tavern's barrels, stools and racks are all of them.
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

/**
 * Effect-mask value above which a depth-less pixel counts as an emitter
 * rather than as the void. The mask is half resolution, so a one-pixel flame
 * edge lands in it faint; the void is a hard zero, so the line can sit low.
 */
const EMIT_LIT = 0.002;

/**
 * How far a depth-less pixel's ray is carried before asking whether it left
 * through a wall. The sky is at infinity and the room box is tens of tiles,
 * so anything past the map is the same answer; this is simply well past it.
 */
const SKY_REACH = 10000;

/** Drawn depth renders to wait for before the mask is allowed to black anything. */
const READY_FRAMES = 2;

type Runtime = {
  scene: Scene;
  camera: ArcRotateCamera;
  pass: PostProcess;
  /** The depth renderer this pass enabled itself, to release when the room ends. */
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
  uniform sampler2D ${EFFECT_MASK_SAMPLER};
  uniform mat4 invView;
  uniform vec2 viewport;  // tan(fov/2) * aspect, tan(fov/2)
  uniform vec4 roomXZ;    // minX, minZ, maxX, maxZ
  uniform vec3 roomY;     // floor, wall top, roof underside
  uniform vec4 roomBox;   // the room's screen footprint in UV: minU, minV, maxU, maxV
  uniform float ready;    // 0 until the depth map holds a rendered frame

  const float FLOOR_SLACK = ${FLOOR_SLACK.toFixed(2)};
  const float FACE_SLACK = ${FACE_SLACK.toFixed(3)};
  const float EMIT_LIT = ${EMIT_LIT.toFixed(4)};

  // Segment from o to o + d against the box, true only where it leaves
  // through a wall. Where it comes in is not the question: the roof is out of
  // the way while the hero is inside, so a ray dropping into the room from
  // the camera above is the view the mask exists to serve. What it reaches on
  // the way out is: a door and a window are holes in a wall, and a ray that
  // leaves over the wall top or down through the floor has left the room for
  // the world outside, which is what goes black.
  bool leavesThroughWall(vec3 o, vec3 d, vec3 bmin, vec3 bmax) {
    vec3 inv = 1.0 / (abs(d) + vec3(1e-6)) * sign(d + vec3(1e-9));
    vec3 t0 = (bmin - o) * inv;
    vec3 t1 = (bmax - o) * inv;
    vec3 tn = min(t0, t1);
    vec3 tf = max(t0, t1);
    float tEnter = max(max(tn.x, tn.y), tn.z);
    float tExit = min(min(tf.x, tf.y), tf.z);

    if (tExit < max(tEnter, 0.0) || tEnter > 1.0) return false;

    // The pixel is in the box: the segment never left it.
    if (tExit >= 1.0) return true;

    // Y crossed last on the way out is the wall top or the floor.
    return tf.y > min(tf.x, tf.z);
  }

  void main(void) {
    vec4 color = texture2D(textureSampler, vUV);

    if (ready < 0.5) {
      gl_FragColor = color;
      return;
    }

    float depth = texture2D(depthSampler, vUV).r;

    vec3 viewDir = vec3((vUV.x * 2.0 - 1.0) * viewport.x, (vUV.y * 2.0 - 1.0) * viewport.y, 1.0);
    vec3 camPos = invView[3].xyz;
    vec3 worldDir =
      invView[0].xyz * viewDir.x +
      invView[1].xyz * viewDir.y +
      invView[2].xyz * viewDir.z;

    vec3 volMin = vec3(roomXZ.x, roomY.x - FLOOR_SLACK, roomXZ.y);
    vec3 volMax = vec3(roomXZ.z, roomY.z, roomXZ.w);
    vec3 wallMax = vec3(roomXZ.z, roomY.y, roomXZ.w);

    // The see-through test rests on "a solid wall would have stopped the ray",
    // and under the floor nothing does: the ground is one-sided, so seen from
    // below it writes no depth. Below the floor the inside test stands alone.
    bool underFloor = camPos.y < volMin.y;

    // The renderer clears to 1e8 where nothing was drawn, so both ends are
    // "no depth here".
    if (depth <= 0.0 || depth >= 1e7) {
      // No depth here, and that is not the same as "outside". Additive
      // geometry writes none, so a candle's own flame quads, a lamp glass and
      // a hearth's glow were being blacked inside the room they belong to.
      // The effect mask is the one buffer that does hold them: an emitter
      // pixel inside the room's screen footprint is the room's own and stays.
      vec3 emit = texture2D(${EFFECT_MASK_SAMPLER}, vUV).rgb;
      float lit = max(emit.r, max(emit.g, emit.b));
      bool framed = all(greaterThanEqual(vUV, roomBox.xy))
        && all(lessThanEqual(vUV, roomBox.zw));

      // The other thing that writes no depth is the sky, and it was going
      // black with everything else - so a doorway framed a black hole where
      // the day should be. A sky pixel is not "nothing", it is a point at
      // infinity, and the question to ask about it is the same one asked
      // about every other pixel: does the ray reach it through a wall?
      // Through a door or a window it does and the sky belongs there; over
      // the wall top it does not, which is the roof the hero is standing
      // under and stays black.
      bool skyThroughWall =
        !underFloor && leavesThroughWall(camPos, worldDir * ${SKY_REACH.toFixed(1)}, volMin, wallMax);

      gl_FragColor = (lit > EMIT_LIT && framed) || skyThroughWall
        ? color
        : vec4(0.0, 0.0, 0.0, color.a);
      return;
    }

    vec3 toPixel = worldDir * depth;
    vec3 p = camPos + toPixel;

    vec3 faceSlack = vec3(FACE_SLACK, 0.0, FACE_SLACK);
    bool inside = all(greaterThanEqual(p, volMin - faceSlack)) && all(lessThanEqual(p, volMax + faceSlack));

    bool seenThrough =
      inside || (!underFloor && leavesThroughWall(camPos, toPixel, volMin, wallMax));

    gl_FragColor = seenThrough ? color : vec4(0.0, 0.0, 0.0, color.a);
  }
  `;
}

const box: [number, number, number, number] = [1, 1, 0, 0];

const corner = new Vector3();
const viewed = new Vector3();
const projected = new Vector3();

/** Slack around the room's screen footprint: a glow halo reaches past its mesh. */
const BOX_MARGIN = 0.03;

/**
 * The room's volume as a screen-space box in UV, for the depth-less branch.
 * An empty box while there is no mask to read, and the whole screen whenever
 * a corner sits at or behind the camera plane: a wrong box would delete the
 * room's own emitters, which is the failure this branch exists to prevent.
 */
function screenBoxOf(
  volume: RoomVolume,
  scene: Scene,
  camera: ArcRotateCamera,
  live: boolean,
  out: [number, number, number, number]
): void {
  if (!live) {
    out[0] = 1;
    out[1] = 1;
    out[2] = 0;
    out[3] = 0;
    return;
  }

  const view = camera.getViewMatrix();
  const transform = scene.getTransformMatrix();

  let minU = 1;
  let minV = 1;
  let maxU = 0;
  let maxV = 0;

  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? volume.maxX : volume.minX,
      i & 2 ? volume.roofY : volume.floorY - FLOOR_SLACK,
      i & 4 ? volume.maxY : volume.minY
    );

    Vector3.TransformCoordinatesToRef(corner, view, viewed);

    if (viewed.z <= 0.1) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 1;
      out[3] = 1;
      return;
    }

    Vector3.TransformCoordinatesToRef(corner, transform, projected);

    const u = projected.x * 0.5 + 0.5;
    const v = projected.y * 0.5 + 0.5;

    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
    maxU = Math.max(maxU, u);
    maxV = Math.max(maxV, v);
  }

  out[0] = minU - BOX_MARGIN;
  out[1] = minV - BOX_MARGIN;
  out[2] = maxU + BOX_MARGIN;
  out[3] = maxV + BOX_MARGIN;
}

let dark: RawTexture | null = null;

/** Stand-in for the effect mask when there is none: every pixel reads unlit. */
function darkFallback(scene: Scene): RawTexture {
  if (dark && dark.getScene() === scene) return dark;

  dark = RawTexture.CreateRGBTexture(
    new Uint8Array([0, 0, 0]),
    1,
    1,
    scene,
    false,
    false,
    Texture.NEAREST_SAMPLINGMODE
  );

  return dark;
}

/**
 * The camera-space z the mask decides on. It is the pass's own renderer, not
 * the G-buffer: the G-buffer deliberately refuses a map object's alpha-keyed
 * cards (`occludes`, the bulk of its cost), and every barrel, stool, crate and
 * rack in a tavern is one, so reading it deleted them from the room they stand
 * in. This renderer takes them.
 */
function depthTexture(own: DepthRenderer | null): BaseTexture | null {
  return own?.getDepthMap() ?? null;
}

/** Stand-in for a bucket the depth pass is not meant to draw this time round. */
const NO_SUBMESHES = new SmartArray<SubMesh>(0);

/** The keyed matter pulled out of the transparent bucket, rebuilt per render. */
const keyedMatter = new SmartArray<SubMesh>(64);
const blendOnly = new SmartArray<SubMesh>(64);

/**
 * Whether the floor drew into the depth map on this render.
 *
 * `DepthRenderer.renderSubMesh` stamps the render id on a submesh it drew and
 * silently skips one whose depth effect is still compiling, so a render is no
 * proof the map holds anything: the pass's first frames in a room draw into an
 * empty map, and a mask reading an empty map takes the depth-less branch
 * everywhere and blacks the room down to its emitters. That is the flash on
 * entering. The terrain is the one surface the mask cannot be wrong about and
 * the one that always fills a room's floor, so it is what the gate waits for.
 */
function drewFloor(scene: Scene, bucket: SmartArray<SubMesh>): boolean {
  const id = scene.getRenderId();

  for (let i = 0; i < bucket.length; i++) {
    const sub = bucket.data[i];

    if (sub._renderId === id && sub.getMesh().metadata?.terrain === true) {
      return true;
    }
  }

  return false;
}

/**
 * Put the room's keyed props into the depth map, and report the renders that
 * actually drew into it.
 *
 * `modelLoader` promotes every TGA-textured mesh to ALPHATESTANDBLEND, which
 * Babylon files as *transparent*, and the depth renderer draws that bucket only
 * under `forceDepthWriteTransparentMeshes` - which would take the additive
 * effect cards with it. Every bottle, candle, stool and rack in a tavern is one
 * of those keyed meshes, so they wrote no depth and the mask blacked them out
 * of the room they stand in. They are drawn a second time round through the
 * opaque slot, keyed by their own texture (`useMeshAlphaTestTexture`); a pure
 * blend mesh is light rather than matter and still writes nothing.
 */
function takeKeyedMatter(
  map: RenderTargetTexture,
  scene: Scene,
  drawn: () => void
): void {
  const inner = map.customRenderFunction;

  if (!inner) return;

  map.customRenderFunction = (
    opaque,
    alphaTest,
    transparent,
    depthOnly,
    beforeTransparents
  ) => {
    keyedMatter.reset();
    blendOnly.reset();

    for (let i = 0; i < transparent.length; i++) {
      const sub = transparent.data[i];

      if (sub.getMaterial()?.transparencyMode === Material.MATERIAL_ALPHABLEND) {
        blendOnly.push(sub);
      } else {
        keyedMatter.push(sub);
      }
    }

    inner(opaque, alphaTest, NO_SUBMESHES, depthOnly, beforeTransparents);
    inner(keyedMatter, NO_SUBMESHES, blendOnly, NO_SUBMESHES);

    if (drewFloor(scene, opaque) || drewFloor(scene, alphaTest)) drawn();
  };
}

function createPass(scene: Scene, camera: ArcRotateCamera): Runtime {
  registerShader();

  const ownDepth = scene.enableDepthRenderer(
    camera,
    false,
    true,
    Texture.NEAREST_SAMPLINGMODE,
    true
  );

  // The depth map is empty until the renderer has drawn into it, and an empty
  // map reads as "no depth" everywhere: for those frames the mask would black
  // the entire room except its emitters, which is the flash of glowing discs
  // on entering. The pass stays identity until the floor is in the map.
  let ready = 0;

  takeKeyedMatter(ownDepth.getDepthMap(), scene, () => {
    if (ready < READY_FRAMES) ready++;
  });

  const pass = new PostProcess(
    'roomMask',
    SHADER,
    ['invView', 'viewport', 'roomXZ', 'roomY', 'roomBox', 'ready'],
    ['depthSampler', EFFECT_MASK_SAMPLER],
    1,
    null,
    Texture.NEAREST_SAMPLINGMODE,
    scene.getEngine(),
    false,
    null,
    Constants.TEXTURETYPE_HALF_FLOAT
  );

  pass.onApply = effect => {
    const depth = depthTexture(runtime?.ownDepth ?? null);
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

    const mask = effectMask();
    // Without a mask (post off) nothing can be told from a depth-less pixel,
    // so the box is empty and the old "black it" rule stands.
    effect.setTexture(EFFECT_MASK_SAMPLER, mask ?? darkFallback(scene));
    screenBoxOf(shown, scene, camera, mask !== null, box);
    effect.setFloat4('roomBox', box[0], box[1], box[2], box[3]);
    effect.setFloat('ready', ready >= READY_FRAMES ? 1 : 0);
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
 * rebuilt this tick: the pass then re-attaches to stay behind them, keeping
 * the depth renderer and the readiness gate it already has.
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
    // Re-order, not rebuild. The AO and the haze attach at the end of the
    // camera's list when they are built, so the mask has to move behind them
    // again - but tearing it down takes the depth renderer and the readiness
    // gate with it, and the frames the gate spends refilling are identity
    // frames with the exterior back on screen. Entering a room ends with the
    // haze being disposed (a room has none), so that flash fired on every
    // entry, about a blend later.
    runtime.camera.detachPostProcess(runtime.pass);
    runtime.camera.attachPostProcess(runtime.pass);

    return { changed: true, live: true };
  }

  if (!want) return { changed: false, live: false };
  if (runtime) return { changed: false, live: true };

  runtime = createPass(scene, camera);

  return { changed: true, live: true };
}

export function roomMaskActive(): boolean {
  return runtime !== null;
}
