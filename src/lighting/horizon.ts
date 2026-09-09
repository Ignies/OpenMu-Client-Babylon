import {
  Constants,
  Mesh,
  ShaderMaterial,
  ShaderStore,
  Texture,
  VertexData,
  type Scene,
} from '../libs/babylon/exports';
import { linearBufferActive } from '../common/lightModel';
import { lookDirector, type LookDirector, type LookState } from './director';
import { profileFor, toLinear, type Rgb, type SkylineLook } from './profiles';

/**
 * The skyline: sole writer of the horizon backdrop mesh. A map that has art
 * for its far scenery wraps that strip around the camera, past everything the
 * map draws and inside the sky dome, so the ground does not simply stop at the
 * haze - there is a country out there.
 *
 * It is scenery, not light. The strip is drawn unlit, takes no exposure and
 * no key, and is pulled toward the sky's own horizon colour so it belongs to
 * whatever sky the map is running (§4.6: the horizon colour is both the
 * dome's bottom and the haze). Classic draws no dome and draws none of this.
 */

/** Ring segments around the camera: 96 keeps a 3.75 degree facet off the eye. */
const SEGMENTS = 96;

/**
 * Band radius in tiles. Only the ordering matters - the mesh rides the camera,
 * so the strip is at the same angle wherever the hero stands - and this sits
 * inside the dome's 2000 so it draws in front of the sky and behind the map,
 * which clears the depth after the sky's group.
 */
const RADIUS = 1500;

/**
 * Mirrored copies of the strip around the circle.
 *
 * Two is the whole trick: the art is a panorama with two unrelated ends, and
 * wrapping it once puts that join on one heading for the player to find. At
 * two mirrored copies both joins fall on a mirror line, where the texture
 * meets itself, and there is no seam at any heading. It doubles the texels
 * per degree as a side effect; more copies than that and a single frame can
 * hold a whole mirrored pair, which is the one way the repeat shows.
 */
const WRAPS = 2;

const SHADER = 'muSkyline';

const DEG = Math.PI / 180;

type Band = {
  scene: Scene;
  mesh: Mesh;
  material: ShaderMaterial;
  texture: Texture;
  art: string;
  /** The geometry's angles, so a profile that only moves colour keeps it. */
  rise: number;
  drop: number;
};

let band: Band | null = null;

let bandScene: Scene | null = null;

let observed: LookDirector | null = null;

/**
 * Called by the director beside `syncSkyDome`: binds the scene and subscribes
 * to the published look, which carries the map, the tier and the room.
 */
export function syncSkyline(scene: Scene): void {
  bandScene = scene;

  const director = lookDirector();
  if (!director || director === observed) return;

  observed = director;
  director.onChange.add(syncBand);
}

export function disposeSkyline(): void {
  if (!band) return;

  band.texture.dispose();
  band.mesh.dispose(false, true);
  band = null;
}

function syncBand(state: Readonly<LookState>): void {
  const scene = bandScene;

  // A room owns the frame and nothing past its walls is drawn, the skyline
  // included; Classic has no dome for it to stand against.
  const sky =
    scene && state.tier > 0 && !state.area ? profileFor(state.world).sky : null;
  const look = sky?.skyline;

  if (!scene || !sky || !look) {
    disposeSkyline();
    return;
  }

  if (
    band &&
    (band.scene !== scene ||
      band.mesh.isDisposed() ||
      band.art !== look.art ||
      band.rise !== look.riseDeg ||
      band.drop !== look.dropDeg)
  ) {
    disposeSkyline();
  }

  band ??= createBand(scene, look);

  const linear = linearBufferActive(scene);
  const horizon: Rgb = linear ? toLinear(sky.horizon) : sky.horizon;

  band.material.setArray3('haze', [horizon[0], horizon[1], horizon[2]]);
  band.material.setArray3('params', [look.haze, look.fade, linear ? 1 : 0]);
}

function createBand(scene: Scene, look: SkylineLook): Band {
  registerShader();

  const mesh = new Mesh('skyline', scene);

  bandVertexData(look.riseDeg, look.dropDeg).applyToMesh(mesh);

  const texture = new Texture(look.art, scene);
  texture.wrapU = Texture.MIRROR_ADDRESSMODE;
  texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 4;
  texture.hasAlpha = true;
  texture.isBlocking = false;

  const material = new ShaderMaterial('skyline', scene, SHADER, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'haze', 'params'],
    samplers: ['art'],
    needAlphaBlending: true,
  });

  material.setTexture('art', texture);
  material.alphaMode = Constants.ALPHA_COMBINE;
  material.backFaceCulling = false;
  // The strip is the only transparent thing in the sky's group; writing depth
  // would only hide the dome from itself on the next frame's clear.
  material.disableDepthWrite = true;

  mesh.material = material;

  // Rides with the camera, with the sky and behind everything else. No
  // metadata: the G-buffer, the effect mask and the cascades admit meshes by
  // their flags, so the strip is in none of them and the haze leaves it alone
  // - it takes its own, below.
  mesh.infiniteDistance = true;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.renderingGroupId = 0;
  mesh.isPickable = false;
  mesh.receiveShadows = false;
  mesh.doNotSyncBoundingInfo = true;

  return {
    scene,
    mesh,
    material,
    texture,
    art: look.art,
    rise: look.riseDeg,
    drop: look.dropDeg,
  };
}

/**
 * The band: one ring of quads, open at both ends, with the strip's top edge
 * `riseDeg` above the eye and its bottom `dropDeg` below it. The seam vertex
 * is duplicated so `u` can run the whole way to `WRAPS` instead of wrapping
 * back to 0 across the last facet.
 */
function bandVertexData(riseDeg: number, dropDeg: number): VertexData {
  const top = RADIUS * Math.tan(riseDeg * DEG);
  const bottom = -RADIUS * Math.tan(dropDeg * DEG);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    const x = Math.sin(a) * RADIUS;
    const z = Math.cos(a) * RADIUS;
    const u = (i / SEGMENTS) * WRAPS;

    positions.push(x, top, z, x, bottom, z);
    uvs.push(u, 1, u, 0);

    if (i < SEGMENTS) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }

  const data = new VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;

  return data;
}

function registerShader(): void {
  if (ShaderStore.ShadersStore[`${SHADER}VertexShader`]) return;

  ShaderStore.ShadersStore[`${SHADER}VertexShader`] = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;

  void main(void) {
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
  `;

  ShaderStore.ShadersStore[`${SHADER}FragmentShader`] = `
  precision highp float;
  uniform sampler2D art;

  /** The sky's horizon, in the buffer's space. */
  uniform vec3 haze;

  /** x: pull toward the haze, y: the bottom fade's span in v, z: buffer is linear. */
  uniform vec3 params;

  varying vec2 vUV;

  void main(void) {
    vec4 texel = texture2D(art, vUV);

    if (texel.a <= 0.004) discard;

    // Display-authored art in a linear buffer, decoded the once, like the
    // clear colour and the dome (§13 F4). Nothing lights it and no exposure
    // follows it, so it lands where it was painted.
    vec3 c = mix(texel.rgb, pow(max(texel.rgb, vec3(0.0)), vec3(2.2)), params.z);

    // The air between here and there. The strip is outside the G-buffer so
    // the distance haze never reaches it, and the art was painted under its
    // own sky rather than this map's.
    c = mix(c, haze, params.x);

    // The bottom edge is a cut across a painted plain, and below it is the
    // void in the horizon colour. Dissolving the last of the strip into that
    // colour is the same fade, from the same air.
    float fade = smoothstep(0.0, params.y, vUV.y);

    gl_FragColor = vec4(c, texel.a * fade);
  }
  `;
}
