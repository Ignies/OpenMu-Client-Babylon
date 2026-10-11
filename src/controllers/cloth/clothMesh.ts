import {
  Color3,
  Constants,
  GlowLayer,
  Material,
  Mesh,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  VertexData,
  type Matrix,
  type Scene,
  type TransformNode,
} from '../render/babylon/exports';
import { getDataTexture } from '../assets/modelLoader';
import { HeldSprites, type HeldLook, type HeldPoint } from '../fx/effectParticles';
import { blobShadowsActive, getShadowMaterial } from '../render/objectShadow';
import { PCT_MASK_ALPHA, PCT_MASK_BLEND, PCT_MASK_DRAW, PCT_MASK_LIGHT, type ClothSpec } from './physicsCloth';

export type Rgb = readonly [number, number, number];

/** MU centimetres to tiles. */
const CM = 1 / 100;
/** `EnableAlphaTest`'s cut (ZzzOpenglUtil.cpp:395). */
const ALPHA_CUT = 0.25;

/** How `Render` draws a cloth (PhysicsManager.cpp:771-804): opaque and culled, keyed, added, or added in a pulse. */
type DrawMode = 'blit' | 'alpha' | 'add' | 'pulse';

function drawMode(flags: number): DrawMode {
  // PCT_MASK_LIGHT draws its sprites, then the faces under EnableAlphaBlend in its own light (:784-816).
  if ((flags & PCT_MASK_LIGHT) !== 0) return 'pulse';
  const draw = flags & PCT_MASK_DRAW;
  return draw === PCT_MASK_ALPHA ? 'alpha' : draw === PCT_MASK_BLEND ? 'add' : 'blit';
}

/** One material per (scene, texture, mode, colour): every wearer of a cloth shares it. */
const materials = new WeakMap<Scene, Map<string, StandardMaterial>>();
/** The `PCT_MASK_LIGHT` materials, their colour `sin(WorldTime * 0.001) * 0.1 + 0.4` (:810-816). */
const pulsing: StandardMaterial[] = [];

/** `Lum` of `Render`'s light, this frame. */
let pulse = 0.4;

/** Every `PCT_MASK_LIGHT` face's colour, and its lights', at `ms` (the clock's WorldTime). */
export function pulseClothLights(ms: number): void {
  pulse = Math.sin(ms * 0.001) * 0.1 + 0.4;
  for (let i = 0; i < pulsing.length; i++) pulsing[i].emissiveColor.set(pulse, pulse, pulse);
}

/**
 * `Render`'s light loop (:791-802), `CreateSprite(BITMAP_LIGHT, vertex k, i * 0.2 + 0.4, Lum * (hor - i) / 5)`:
 * sprite k sits on vertex k, but its scale and light come from the loop's outer index, `k / ver`.
 */
export function lightSprite(k: number, hor: number, ver: number, lum: number, out: HeldLook): void {
  const i = Math.floor(k / ver);
  const light = (lum * (hor - i)) / 5;
  out.scale = i * 0.2 + 0.4;
  out.r = out.g = out.b = light;
  out.rotation = 0;
}

function clothMaterial(scene: Scene, texture: string, mode: DrawMode, light: Rgb): StandardMaterial {
  let byKey = materials.get(scene);
  if (!byKey) materials.set(scene, (byKey = new Map()));
  const key = mode === 'pulse' ? `${texture}|pulse` : `${texture}|${mode}|${light[0]},${light[1]},${light[2]}`;
  const cached = byKey.get(key);
  if (cached) return cached;

  // The faces carry `glColor` alone, no terrain light (RenderFace's vertex colour, :817-821): with the
  // lighting off the Standard fragment is `emissive x texel`.
  const material = new StandardMaterial(`cloth:${key}`, scene);
  material.disableLighting = true;
  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.ambientColor = Color3.Black();
  material.emissiveColor = new Color3(light[0], light[1], light[2]);
  const tex = getDataTexture(scene, texture);
  material.diffuseTexture = tex;
  if (mode === 'blit') {
    // DisableAlphaBlend: opaque with the faces culled, so each side shows its own texture.
    material.backFaceCulling = true;
  } else if (mode === 'alpha') {
    // EnableAlphaTest: blended and keyed, both faces drawn, the depth written.
    tex.hasAlpha = true;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
    material.alphaCutOff = ALPHA_CUT;
    material.backFaceCulling = false;
  } else {
    // EnableAlphaBlend: (ONE, ONE), no depth write, no fog.
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    material.alphaMode = Constants.ALPHA_ONEONE;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    material.fogEnabled = false;
  }
  if (mode === 'pulse') pulsing.push(material);
  else material.freeze();
  byKey.set(key, material);
  return material;
}

/** `RenderFace`'s quads (:836-883): the front face turns one way, the back face the other. */
function faceIndices(hor: number, ver: number, front: boolean, out: number[]): void {
  for (let j = 0; j < ver - 1; j++) {
    for (let i = 0; i < hor - 1; i++) {
      const a = hor * j + i;
      const b = a + 1;
      const c = a + 1 + hor;
      const d = a + hor;
      if (front) out.push(a, b, c, a, c, d);
      else out.push(a, d, c, a, c, b);
    }
  }
}

const min = new Vector3();
const max = new Vector3();

/**
 * `CPhysicsCloth::Render` (PhysicsManager.cpp:757-886): the grid as two faces in the wearer's
 * `CloakLight`. One mesh when both faces have the same texture (its index buffer holds both, as the
 * original draws them one after the other), two otherwise. The positions are the cloth's at its last
 * tick, in world tiles, written in place; `setWorld` carries them along until the next one.
 */
export class ClothMesh {
  readonly faces: Mesh[] = [];
  private readonly positions: Float32Array;
  private readonly mode: DrawMode;
  private light: Rgb;
  private shadow: Mesh | null = null;
  private shadowOn = false;
  private facesOn = false;
  /** A `PCT_MASK_LIGHT` cloth's lights, one on each vertex, and where each is this frame. */
  private readonly sprites: HeldSprites | null = null;
  private readonly spots: Vector3[] = [];
  private readonly look: (k: number, out: HeldLook) => void = () => {};

  constructor(
    private readonly scene: Scene,
    private readonly spec: ClothSpec,
    light: Rgb,
    /** The wearer's root: where the Classic shadow folds from. */
    private readonly origin: TransformNode
  ) {
    const [hor, ver] = spec.grid;
    this.mode = drawMode(spec.flags);
    this.light = light;
    this.positions = new Float32Array(hor * ver * 3);
    const uvs = new Float32Array(hor * ver * 2);
    for (let j = 0; j < ver; j++) {
      for (let i = 0; i < hor; i++) {
        uvs[2 * (hor * j + i)] = i / (hor - 1);
        uvs[2 * (hor * j + i) + 1] = Math.min(0.99, j / (ver - 1));
      }
    }
    const same = spec.front === spec.back;
    for (const front of same ? [true] : [true, false]) {
      const indices: number[] = [];
      faceIndices(hor, ver, front, indices);
      if (same) faceIndices(hor, ver, false, indices);
      const data = new VertexData();
      data.positions = this.positions;
      data.uvs = uvs;
      data.indices = indices;
      const mesh = new Mesh(`cloth_${spec.front}`, scene);
      data.applyToMesh(mesh, true);
      mesh.material = clothMaterial(scene, front ? spec.front : spec.back, this.mode, light);
      mesh.isPickable = false;
      mesh.receiveShadows = false;
      // The keyed and opaque cloth is matter: the cascades take it. An added one is light.
      mesh.metadata = { csmCaster: this.mode === 'blit' || this.mode === 'alpha' };
      mesh.setEnabled(false);
      this.faces.push(mesh);
    }
    if (this.mode === 'pulse') {
      const points: HeldPoint[] = [];
      for (let k = 0; k < hor * ver; k++) {
        const spot = new Vector3();
        this.spots.push(spot);
        points.push({ node: { getAbsolutePosition: () => spot }, texture: 'flare01', blend: 'add' });
      }
      this.sprites = new HeldSprites(scene, points);
      this.look = (k, out) => lightSprite(k, hor, ver, pulse, out);
    }
  }

  /** The cloth's vertices (MU world centimetres) into the vertex buffer, as world tiles. */
  write(pos: Float64Array): void {
    const p = this.positions;
    min.setAll(Infinity);
    max.setAll(-Infinity);
    for (let v = 0; v < p.length; v += 3) {
      const x = pos[v] * CM;
      const y = pos[v + 2] * CM;
      const z = pos[v + 1] * CM;
      p[v] = x;
      p[v + 1] = y;
      p[v + 2] = z;
      min.minimizeInPlaceFromFloats(x, y, z);
      max.maximizeInPlaceFromFloats(x, y, z);
    }
    for (let f = 0; f < this.faces.length; f++) {
      const mesh = this.faces[f];
      mesh.updateVerticesData(VertexBuffer.PositionKind, p, false, false);
      mesh.getBoundingInfo().reConstruct(min, max);
    }
  }

  /** The world the last tick's positions are carried by (the anchor bone's move since that tick). */
  setWorld(world: Matrix): void {
    for (let f = 0; f < this.faces.length; f++) this.faces[f].freezeWorldMatrix(world);
    this.shadow?.freezeWorldMatrix(world);
    if (!this.sprites || !this.facesOn) return;
    const p = this.positions;
    for (let k = 0; k < this.spots.length; k++) {
      Vector3.TransformCoordinatesFromFloatsToRef(p[3 * k], p[3 * k + 1], p[3 * k + 2], world, this.spots[k]);
    }
    this.sprites.update(true, this.look);
  }

  /** `CloakLight`: white, or the duel / soccer team colour (ZzzCharacter.cpp:9188-9246). */
  setLight(light: Rgb): void {
    if (light[0] === this.light[0] && light[1] === this.light[1] && light[2] === this.light[2]) return;
    this.light = light;
    const same = this.faces.length === 1;
    for (let f = 0; f < this.faces.length; f++) {
      this.faces[f].material = clothMaterial(this.scene, f === 0 || same ? this.spec.front : this.spec.back, this.mode, light);
    }
  }

  /** The faces (and a light cloth's sprites) and the Classic shadow, each on or off. */
  show(faces: boolean, shadow: boolean): void {
    this.setShadow(shadow);
    if (faces === this.facesOn) return;
    this.facesOn = faces;
    for (let f = 0; f < this.faces.length; f++) this.faces[f].setEnabled(faces);
    if (!faces) this.sprites?.update(false, this.look);
  }

  /**
   * The Classic shadow: `RenderBodyShadow` with the cloth (ZzzBMD.cpp:2642-2710) lays every quad on the
   * ground, untextured. A clone sharing the front face's buffers under the blob material, made on first use.
   */
  setShadow(on: boolean): void {
    const want = on && blobShadowsActive();
    if (want === this.shadowOn) return;
    this.shadowOn = want;
    if (want && !this.shadow) this.shadow = this.makeShadow();
    this.shadow?.setEnabled(want);
  }

  private makeShadow(): Mesh {
    const source = this.faces[0];
    const shadow = source.clone(`${source.name}_shadow`, null, true);
    shadow.material = getShadowMaterial(this.scene, 0);
    shadow.isPickable = false;
    shadow.receiveShadows = false;
    shadow.alwaysSelectAsActiveMesh = true;
    shadow.doNotSyncBoundingInfo = true;
    shadow.metadata = { SkipBoundingBox: true, shadowOriginNode: this.origin, shadowFromGround: false, shadowAlpha: 1 };
    for (const layer of this.scene.effectLayers) {
      if (layer instanceof GlowLayer) layer.addExcludedMesh(shadow);
    }
    shadow.freezeWorldMatrix(source.getWorldMatrix());
    return shadow;
  }

  dispose(): void {
    this.sprites?.dispose();
    this.shadow?.dispose(false, false);
    for (const mesh of this.faces) mesh.dispose(false, false);
    this.faces.length = 0;
  }
}
