import { TILE_CM } from './terrain/consts';
import {
  AnimationGroup,
  Constants,
  Material,
  Mesh,
  Quaternion,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
  type AbstractMesh,
  type Scene,
} from '../libs/babylon/exports';
import { downloadDataFile, hasDataFile } from '../libs/mu/dataFolder';
import { loadMuSprite } from '../libs/mu/sprites';
import { getMaterial, loadGLTF } from './modelLoader';
import { BlendState } from './objects/enum';
import { spawnParticle } from './effectParticles';
import type { World } from '../ecs/world';

const TICKS_PER_SECOND = 25;


const OZJ_HEADER_SIZE = 24;

const GROUND_CLEARANCE = 5 / TILE_CM;

const MODEL_SCALE = 0.6;

const MODEL_ANIMATION_SPEED = (0.3 * TICKS_PER_SECOND) / 24;

const ORANGE: readonly [number, number, number] = [1, 0.7, 0.3];

const YELLOW: readonly [number, number, number] = [1, 1, 0];

const textureCache = new Map<string, Promise<Texture>>();

export function loadEffectTexture(scene: Scene, file: string): Promise<Texture> {
  const cached = textureCache.get(file);
  if (cached) return cached;

  const pending = (async () => {
    // A file this version's tree does not have goes through the sprite
    // loader too: it hands back a 1x1 transparent pixel, so the effect draws
    // nothing instead of retrying a 404 every frame (`hasDataFile`).
    if (/\.ozt$/i.test(file) || !hasDataFile(file)) {
      // OZT (TGA with alpha): decoded through the sprite loader.
      const sprite = await loadMuSprite(file);
      return await new Promise<Texture>((resolve, reject) => {
        const texture = new Texture(
          sprite.url,
          scene,
          undefined,
          undefined,
          undefined,
          () => resolve(texture),
          (message, exception) => reject(exception ?? new Error(message ?? file))
        );
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      });
    }

    const ozj = await downloadDataFile(file);

    const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], {
      type: 'image/jpeg',
    });

    return await new Promise<Texture>((resolve, reject) => {
      const texture = new Texture(
        URL.createObjectURL(blob),
        scene,
        undefined,
        undefined,
        undefined,
        () => resolve(texture),
        (message, exception) => {
          console.error(`Could not load effect texture ${file}:`, message ?? exception);
          reject(exception ?? new Error(message ?? file));
        }
      );

      texture.wrapU = Texture.CLAMP_ADDRESSMODE;
      texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    });
  })();

  // Consumers that dispose a shared texture (particle systems do by default)
  // would otherwise leave the cache handing out a dead handle for the rest of
  // the session; evicting on dispose makes the next ask reload instead.
  void pending.then(texture => {
    texture.onDisposeObservable.addOnce(() => {
      if (textureCache.get(file) === pending) textureCache.delete(file);
    });
  });

  textureCache.set(file, pending);

  return pending;
}

function excludeFromGlow(world: World, mesh: Mesh | AbstractMesh): void {
  world.scene.look?.glow.addExcludedMesh(mesh as Mesh);
}

function createAdditiveMaterial(scene: Scene, name: string): StandardMaterial {
  const material = new StandardMaterial(name, scene);

  material.diffuseColor.set(0, 0, 0);
  material.specularColor.set(0, 0, 0);
  material.ambientColor.set(0, 0, 0);
  material.disableLighting = true;

  material.alphaMode = Constants.ALPHA_ONEONE;
  material.transparencyMode = Material.MATERIAL_ALPHABLEND;
  material.backFaceCulling = false;
  material.disableDepthWrite = true;

  return material;
}

/**
 * RenderTerrainAlphaBitmap (ZzzLodTerrain.cpp:1930): a texture draped over
 * the terrain grid around (x, y), `scale` tiles wide, rotated in place.
 */
export class TerrainDecal {
  readonly #cols: number;
  readonly #mesh: Mesh;
  readonly #material: StandardMaterial;
  readonly #positions: Float32Array;
  readonly #uvs: Float32Array;
  readonly #lineX: Float64Array;
  readonly #lineY: Float64Array;
  #textured = false;

  constructor(
    world: World,
    name: string,
    textureFile: string,
    maxScale: number,
    blend: 'additive' | 'alpha' = 'additive'
  ) {
    this.#cols = Math.ceil(maxScale) + 2;

    const verts = this.#cols * this.#cols;

    this.#positions = new Float32Array(verts * 3);
    this.#uvs = new Float32Array(verts * 2);
    this.#lineX = new Float64Array(this.#cols);
    this.#lineY = new Float64Array(this.#cols);

    const indices: number[] = [];

    for (let j = 0; j < this.#cols - 1; j++) {
      for (let i = 0; i < this.#cols - 1; i++) {
        const a = i + j * this.#cols;

        indices.push(a, a + 1, a + this.#cols + 1);
        indices.push(a, a + this.#cols + 1, a + this.#cols);
      }
    }

    const mesh = new Mesh(name, world.scene);

    const data = new VertexData();
    data.positions = this.#positions;
    data.uvs = this.#uvs;
    data.indices = indices;
    data.applyToMesh(mesh, true);

    mesh.setParent(world.mapParent);
    mesh.isPickable = false;

    mesh.alwaysSelectAsActiveMesh = true;

    mesh.material = this.#material = createAdditiveMaterial(
      world.scene,
      `${name}Material`
    );
    if (blend === 'alpha') {
      // EnableAlphaBlend(): straight alpha from the texture (blood, footprints).
      this.#material.alphaMode = Constants.ALPHA_COMBINE;
      this.#material.useAlphaFromDiffuseTexture = true;
    }

    this.#material.zOffset = -2;

    excludeFromGlow(world, mesh);

    mesh.setEnabled(false);

    this.#mesh = mesh;

    void loadEffectTexture(world.scene, textureFile).then(texture => {
      // Straight-alpha decals (blood, footprints) need the texture flagged,
      // otherwise useAlphaFromDiffuseTexture is ignored and the black
      // background of the TGA is drawn.
      texture.hasAlpha = this.#material.alphaMode === Constants.ALPHA_COMBINE;
      this.#material.diffuseTexture = texture;
      this.#textured = true;
    });
  }

  hide(): void {
    this.#mesh.setEnabled(false);
  }

  get enabled(): boolean {
    return this.#mesh.isEnabled(false);
  }

  /** o->Alpha of the pointer effect (fade-out during its last 50 ticks). */
  setAlpha(alpha: number): void {
    this.#material.alpha = alpha;
  }

  #gridLines(a: number, b: number, out: Float64Array): void {
    let n = 0;

    out[n++] = a;

    for (let t = Math.floor(a) + 1; t < b && n < out.length - 1; t++) {
      out[n++] = t;
    }

    while (n < out.length) out[n++] = b;
  }

  draw(
    world: World,
    x: number,
    y: number,
    scale: number,
    rotationDeg: number,
    light: readonly [number, number, number]
  ): void {
    if (!this.#textured || scale <= 0) return;

    const half = scale * 0.5;

    const x0 = x - half;
    const y0 = y - half;

    this.#gridLines(x0, x + half, this.#lineX);
    this.#gridLines(y0, y + half, this.#lineY);

    const angle = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const positions = this.#positions;
    const uvs = this.#uvs;

    for (let j = 0; j < this.#cols; j++) {
      const wy = this.#lineY[j];

      for (let i = 0; i < this.#cols; i++) {
        const wx = this.#lineX[i];
        const v = i + j * this.#cols;

        positions[v * 3 + 0] = wx;
        positions[v * 3 + 1] =
          world.getTerrainHeight(wx, wy) + GROUND_CLEARANCE;
        positions[v * 3 + 2] = wy;

        const du = (wx - x0) / scale - 0.5;
        const dv = (wy - y0) / scale - 0.5;

        uvs[v * 2 + 0] = du * cos - dv * sin + 0.5;
        uvs[v * 2 + 1] = du * sin + dv * cos + 0.5;
      }
    }

    this.#mesh.updateVerticesData('position', positions);
    this.#mesh.updateVerticesData('uv', uvs);

    this.#material.emissiveColor.set(light[0], light[1], light[2]);
    this.#mesh.setEnabled(true);
  }
}

const CURSORPIN1 = 'Effect/cursorpin01.OZJ';

const CURSORPIN2 = 'Effect/cursorpin02.OZJ';

const EMPACT01 = 'Effect/empact01.OZJ';

const FLARE01 = 'Effect/flare01.OZJ';

const RIBBON_TAILS = 30;

const RIBBON_SCALE = 5;

const RIBBON_LIFETIME = 100;

class Ribbon {
  readonly #mesh: Mesh;
  readonly #material: StandardMaterial;
  readonly #positions: Float32Array;
  readonly #uvs: Float32Array;

  readonly #tails: Float32Array;
  #numTails = 0;
  #due = 0;
  #seed = true;
  #textured = false;
  #lifeTime = 0;

  constructor(world: World, index: number) {
    this.#tails = new Float32Array(RIBBON_TAILS * 4 * 3);

    const quads = (RIBBON_TAILS - 1) * 2;

    this.#positions = new Float32Array(quads * 4 * 3);
    this.#uvs = new Float32Array(quads * 4 * 2);

    const indices: number[] = [];
    for (let q = 0; q < quads; q++) {
      const b = q * 4;
      indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }

    const mesh = new Mesh(`moveTargetRibbon${index}`, world.scene);

    const data = new VertexData();
    data.positions = this.#positions;
    data.uvs = this.#uvs;
    data.indices = indices;
    data.applyToMesh(mesh, true);

    mesh.setParent(world.mapParent);
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);

    mesh.material = this.#material = createAdditiveMaterial(
      world.scene,
      `moveTargetRibbon${index}Material`
    );

    this.#material.emissiveColor.set(YELLOW[0], YELLOW[1], YELLOW[2]);

    excludeFromGlow(world, mesh);

    this.#mesh = mesh;

    void loadEffectTexture(world.scene, FLARE01).then(texture => {
      // Straight-alpha decals (blood, footprints) need the texture flagged,
      // otherwise useAlphaFromDiffuseTexture is ignored and the black
      // background of the TGA is drawn.
      texture.hasAlpha = this.#material.alphaMode === Constants.ALPHA_COMBINE;
      this.#material.diffuseTexture = texture;
      this.#textured = true;
    });
  }

  reset(): void {
    this.#numTails = 0;
    this.#due = 0;
    this.#seed = true;
    this.#lifeTime = RIBBON_LIFETIME;
    this.#mesh.setEnabled(false);
  }

  update(
    f: number,
    worldTimeMs: number,
    index: number,
    centre: Vector3,
    yaw: number
  ): void {
    if (this.#lifeTime <= 0) return;

    this.#lifeTime -= f;

    if (this.#lifeTime <= 0) {
      this.#mesh.setEnabled(false);
      return;
    }

    this.#due += f;

    if (this.#due > 4) this.#due = 4;

    while (this.#due >= 1) {
      this.#due -= 1;
      this.#pushTail(worldTimeMs, index, centre, yaw);
    }

    this.#rebuild();
  }

  #pushTail(
    worldTimeMs: number,
    index: number,
    centre: Vector3,
    yaw: number
  ): void {
    let frame = Math.trunc(worldTimeMs / 40);
    frame = (index % 2 ? frame : -frame) + index * 53731;

    const speed0 = 0.048;
    const speed1 = 0.0613;
    const speed2 = 0.1113;

    const s = Math.sin((frame + 55555) * speed0);
    const dirTemp0 = s * Math.cos(frame * speed1);
    const dirTemp1 = s * Math.sin(frame * speed1);
    const dirTemp2 = Math.cos((frame + 55555) * speed0);

    const sinAdd = Math.sin((frame + 11111) * speed2);
    const cosAdd = Math.cos((frame + 11111) * speed2);

    const dirX = cosAdd * dirTemp1 - sinAdd * dirTemp2;
    const dirY = sinAdd * dirTemp1 + cosAdd * dirTemp2;
    const dirZ = dirTemp0;

    const px = centre.x + (dirX * 20) / TILE_CM;
    const pz = centre.z + (dirY * 20) / TILE_CM;
    const py = centre.y + (10 + 100 + dirZ * 40) / TILE_CM;

    const tails = this.#tails;

    if (!this.#seed) {
      this.#numTails = Math.min(this.#numTails + 1, RIBBON_TAILS - 1);

      tails.copyWithin(12, 0, this.#numTails * 12);
    }

    const half = RIBBON_SCALE * 0.5;

    const ax = (half * Math.cos(yaw)) / TILE_CM;
    const az = (half * Math.sin(yaw)) / TILE_CM;
    const ay = half / TILE_CM;

    tails[0] = px - ax;
    tails[1] = py;
    tails[2] = pz - az;

    tails[3] = px + ax;
    tails[4] = py;
    tails[5] = pz + az;

    tails[6] = px;
    tails[7] = py - ay;
    tails[8] = pz;

    tails[9] = px;
    tails[10] = py + ay;
    tails[11] = pz;

    if (this.#seed) {
      for (let j = 1; j < RIBBON_TAILS; j++) {
        tails.copyWithin(j * 12, 0, 12);
      }

      this.#numTails = 1;
      this.#seed = false;
    }
  }

  #rebuild(): void {
    const segments = this.#textured ? this.#numTails : 0;

    if (segments <= 0) {
      this.#mesh.setEnabled(false);
      return;
    }

    const tails = this.#tails;
    const positions = this.#positions;
    const uvs = this.#uvs;

    let v = 0;

    const emit = (tail: number, corner: number, u: number, vCoord: number) => {
      const t = (tail * 4 + corner) * 3;

      positions[v * 3 + 0] = tails[t + 0];
      positions[v * 3 + 1] = tails[t + 1];
      positions[v * 3 + 2] = tails[t + 2];

      uvs[v * 2 + 0] = u;
      uvs[v * 2 + 1] = vCoord;

      v++;
    };

    for (let j = 0; j < segments; j++) {
      const u1 = (segments - j) / (RIBBON_TAILS - 1);
      const u2 = (segments - (j + 1)) / (RIBBON_TAILS - 1);

      emit(j, 2, u1, 1);
      emit(j, 3, u1, 0);
      emit(j + 1, 3, u2, 0);
      emit(j + 1, 2, u2, 1);

      emit(j, 0, u1, 0);
      emit(j, 1, u1, 1);
      emit(j + 1, 1, u2, 1);
      emit(j + 1, 0, u2, 0);
    }

    for (; v < positions.length / 3; v++) {
      positions[v * 3 + 0] = positions[(v - 1) * 3 + 0];
      positions[v * 3 + 1] = positions[(v - 1) * 3 + 1];
      positions[v * 3 + 2] = positions[(v - 1) * 3 + 2];
    }

    this.#mesh.updateVerticesData('position', positions);
    this.#mesh.updateVerticesData('uv', uvs);
    this.#mesh.setEnabled(true);
  }
}

type Pin1 = {
  live: boolean;
  lifeTime: number;
  scale: number;
  alpha: number;
  light: [number, number, number];
  decal: TerrainDecal;
};

export class MoveTargetEffect {
  readonly #world: World;

  #worldTimeMs = 0;

  #live = false;
  readonly #position = new Vector3();
  #yaw = 0;
  #lifeTime = 0;
  #blendMeshLight = 1;
  #sparkDue = 0;
  #lastBurst = -1;

  #modelNode: TransformNode | null = null;
  #modelAnimation: AnimationGroup | null = null;
  #modelLight: Vector3 | null = null;
  #modelLoading = false;

  #pin2Live = false;
  #pin2LifeTime = 0;
  #pin2Scale = 0;
  #pin2Alpha = 1;
  #pin2Growing = false;
  readonly #pin2Light: [number, number, number] = [...ORANGE];
  readonly #pin2Decal: TerrainDecal;

  #ringLive = false;
  #ringLifeTime = 0;
  #ringScale = 0;
  #ringAlpha = 1;
  readonly #ringHeadAngle: [number, number, number] = [0, 0, 0];
  readonly #ringLight: [number, number, number] = [...ORANGE];
  readonly #ringDecals: readonly [TerrainDecal, TerrainDecal];

  readonly #pin1: readonly Pin1[];

  readonly #ribbons: readonly Ribbon[];

  constructor(world: World) {
    this.#world = world;

    this.#pin2Decal = new TerrainDecal(world, 'moveTargetPin2', CURSORPIN2, 1.8);

    this.#ringDecals = [
      new TerrainDecal(world, 'moveTargetRing0', EMPACT01, 0.8),
      new TerrainDecal(world, 'moveTargetRing1', EMPACT01, 0.96),
    ];

    this.#pin1 = [0, 1, 2].map(i => ({
      live: false,
      lifeTime: 0,
      scale: 0,
      alpha: 1,
      light: [...ORANGE] as [number, number, number],
      decal: new TerrainDecal(world, `moveTargetPin1_${i}`, CURSORPIN1, 1.2),
    }));

    this.#ribbons = [0, 1, 2, 3].map(i => new Ribbon(world, i));
  }

  spawn(x: number, y: number, z: number, yaw: number): void {
    this.#position.set(x, y, z);
    this.#yaw = yaw;

    this.#live = true;
    this.#lifeTime = 30;
    this.#blendMeshLight = 1;
    this.#sparkDue = 0;
    this.#lastBurst = -1;

    if (this.#modelAnimation) {
      this.#modelAnimation.stop();
      this.#modelAnimation.play(true);
    }

    this.#loadModel();

    this.#pin2Live = true;
    this.#pin2LifeTime = 30;
    this.#pin2Scale = 1.8;
    this.#pin2Alpha = 1;
    this.#pin2Growing = false;
    this.#pin2Light[0] = ORANGE[0];
    this.#pin2Light[1] = ORANGE[1];
    this.#pin2Light[2] = ORANGE[2];

    this.#ringLive = true;
    this.#ringLifeTime = 24;
    this.#ringScale = 0.8;
    this.#ringAlpha = 1;
    this.#ringHeadAngle[0] = 0;
    this.#ringHeadAngle[1] = 0;
    this.#ringHeadAngle[2] = 0;
    this.#ringLight[0] = ORANGE[0];
    this.#ringLight[1] = ORANGE[1];
    this.#ringLight[2] = ORANGE[2];

    for (const pin of this.#pin1) {
      pin.live = false;
      pin.decal.hide();
    }

    for (const ribbon of this.#ribbons) ribbon.reset();
  }

  update(deltaSeconds: number): void {
    this.#worldTimeMs += deltaSeconds * 1000;

    const f = Math.min(1, deltaSeconds * TICKS_PER_SECOND);

    this.#updateModel(f);
    this.#updatePin2(f);
    this.#updateRing(f);
    this.#updatePin1(f);
    this.#updateRibbons(f);
  }

  #updateModel(f: number): void {
    if (!this.#live) return;

    this.#sparkDue += f;
    if (this.#sparkDue > 4) this.#sparkDue = 4;

    while (this.#sparkDue >= 1) {
      this.#sparkDue -= 1;

      void spawnParticle(
        this.#world.scene,
        'spark03_24',
        {
          x: this.#position.x,
          y: this.#position.y + 110 / TILE_CM,
          z: this.#position.z,
        },
        this.#yaw,
        1,
        ORANGE
      );
    }

    const marker = Math.trunc(this.#lifeTime);

    if (marker % 15 === 0 && marker !== this.#lastBurst) {
      this.#lastBurst = marker;
      this.#spawnPin1();
    }

    if (this.#lifeTime <= 10) {
      this.#blendMeshLight -= 0.05 * f;
      if (this.#blendMeshLight < 0) this.#blendMeshLight = 0;
    }

    this.#lifeTime -= f;

    if (this.#lifeTime <= 0) {
      this.#live = false;
      this.#modelNode?.setEnabled(false);
      return;
    }

    const node = this.#modelNode;
    if (!node) return;

    node.position.copyFrom(this.#position);
    node.rotation.y = this.#yaw;
    node.setEnabled(true);

    this.#modelLight?.set(
      ORANGE[0] * this.#blendMeshLight,
      ORANGE[1] * this.#blendMeshLight,
      ORANGE[2] * this.#blendMeshLight
    );
  }

  #updatePin2(f: number): void {
    if (!this.#pin2Live) return;

    if (this.#pin2Scale >= 1.8) this.#pin2Growing = false;
    else if (this.#pin2Scale <= 0.8) this.#pin2Growing = true;

    this.#pin2Scale += (this.#pin2Growing ? 0.15 : -0.15) * f;

    if (this.#pin2LifeTime <= 10) {
      this.#pin2Alpha -= 0.05 * f;
      if (this.#pin2Alpha < 0) this.#pin2Alpha = 0;

      const gain = Math.pow(this.#pin2Alpha, f);
      this.#pin2Light[0] *= gain;
      this.#pin2Light[1] *= gain;
      this.#pin2Light[2] *= gain;
    }

    this.#pin2LifeTime -= f;

    if (this.#pin2LifeTime <= 0) {
      this.#pin2Live = false;
      this.#pin2Decal.hide();
      return;
    }

    this.#pin2Decal.draw(
      this.#world,
      this.#position.x,
      this.#position.z,
      this.#pin2Scale,
      0,
      this.#pin2Light
    );
  }

  #updateRing(f: number): void {
    if (!this.#ringLive) return;

    this.#ringHeadAngle[0] += 2 * f;
    this.#ringHeadAngle[1] -= 2 * f;
    this.#ringHeadAngle[2] += 2 * f;

    if (this.#ringLifeTime <= 10) {
      this.#ringAlpha -= 0.05 * f;
      if (this.#ringAlpha < 0) this.#ringAlpha = 0;

      const gain = Math.pow(this.#ringAlpha, f);
      this.#ringLight[0] *= gain;
      this.#ringLight[1] *= gain;
      this.#ringLight[2] *= gain;
    }

    this.#ringLifeTime -= f;

    if (this.#ringLifeTime <= 0) {
      this.#ringLive = false;
      this.#ringDecals[0].hide();
      this.#ringDecals[1].hide();
      return;
    }

    const light: [number, number, number] = [
      this.#ringLight[0] * this.#ringAlpha,
      this.#ringLight[1] * this.#ringAlpha,
      this.#ringLight[2] * this.#ringAlpha,
    ];

    this.#ringDecals[0].draw(
      this.#world,
      this.#position.x,
      this.#position.z,
      this.#ringScale,
      this.#ringHeadAngle[1],
      light
    );

    this.#ringDecals[1].draw(
      this.#world,
      this.#position.x,
      this.#position.z,
      this.#ringScale * 1.2,
      this.#ringHeadAngle[2],
      light
    );
  }

  #spawnPin1(): void {
    const pin = this.#pin1.find(p => !p.live);
    if (!pin) return;

    pin.live = true;
    pin.lifeTime = 20;
    pin.scale = 1.2;
    pin.alpha = 1;
    pin.light[0] = ORANGE[0];
    pin.light[1] = ORANGE[1];
    pin.light[2] = ORANGE[2];
  }

  #updatePin1(f: number): void {
    for (const pin of this.#pin1) {
      if (!pin.live) continue;

      pin.scale -= 0.04 * f;

      if (pin.lifeTime <= 10) {
        pin.alpha -= 0.05 * f;
        if (pin.alpha < 0) pin.alpha = 0;

        const gain = Math.pow(pin.alpha, f);
        pin.light[0] *= gain;
        pin.light[1] *= gain;
        pin.light[2] *= gain;
      }

      pin.lifeTime -= f;

      if (pin.scale <= 0.2 || pin.lifeTime <= 0) {
        pin.live = false;
        pin.decal.hide();
        continue;
      }

      pin.decal.draw(
        this.#world,
        this.#position.x,
        this.#position.z,
        pin.scale,
        0,
        pin.light
      );
    }
  }

  #updateRibbons(f: number): void {
    for (let i = 0; i < this.#ribbons.length; i++) {
      this.#ribbons[i].update(
        f,
        this.#worldTimeMs,
        i,
        this.#position,
        this.#yaw
      );
    }
  }

  #loadModel(): void {
    if (this.#modelNode || this.#modelLoading) return;

    this.#modelLoading = true;

    void loadGLTF('Effect/MoveTargetPosEffect.glb', this.#world).then(gltf => {
      const node = new TransformNode('moveTargetPin', this.#world.scene);
      node.setParent(this.#world.mapParent);
      node.rotationQuaternion = null;
      node.scaling.setAll(MODEL_SCALE);

      gltf.mesh.setParent(node);
      gltf.mesh.position.setAll(0);
      gltf.mesh.scaling.set(1, -1, 1);
      gltf.mesh.rotationQuaternion = Quaternion.FromEulerAngles(
        -Math.PI / 2,
        0,
        0
      );

      const bodyLight = new Vector3(ORANGE[0], ORANGE[1], ORANGE[2]);

      const bright = getMaterial(
        this.#world.scene,
        false,
        Material.MATERIAL_ALPHABLEND,
        BlendState.ALPHA_ONEOE,
        true
      );

      gltf.mesh.getChildMeshes(false).forEach((mesh: AbstractMesh) => {
        mesh.metadata ??= {};
        mesh.metadata.bodyLight = bodyLight;
        mesh.metadata.brightMesh = true;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.material = bright;

        excludeFromGlow(this.#world, mesh);
      });

      this.#modelLight = bodyLight;
      this.#modelNode = node;
      this.#modelAnimation = gltf.animationGroups[0] ?? null;

      if (this.#modelAnimation) {
        this.#modelAnimation.speedRatio = MODEL_ANIMATION_SPEED;
        this.#modelAnimation.play(true);
      }

      node.setEnabled(this.#live);
    });
  }
}
