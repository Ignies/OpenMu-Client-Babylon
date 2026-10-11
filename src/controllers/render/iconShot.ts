import {
  Color4,
  RenderTargetTexture,
  TargetCamera,
  TransformNode,
  Vector3,
  type BaseTexture,
  type Observer,
  type Scene,
} from './babylon/exports';
import { getFlatLitVariant } from '../assets/modelLoader';

/**
 * One-shot pictures of a model (a bag item the icon pack has no file for): built on request, drawn
 * once into a small target with their own camera, read back, cached as an image URL and freed.
 * Nothing runs per frame while the queue is empty, and at most one picture is drawn per frame,
 * after the frame. A spin (the item under the cursor) keeps its target and redraws it turned
 * every frame into one kept buffer, one item at a time. See render/readme.md.
 */

/** The layer only the shot's camera draws: Babylon's default masks (0x0FFFFFFF) leave it out of every other view. */
export const ICON_LAYER = 0x10000000;

/** Frames a subject waits for its shaders and textures before it is drawn as it is. */
const READY_FRAMES = 120;

/**
 * The picture: its size in pixels and the part of the root's frame it covers. The root turns MU's
 * frame upright, so a child placed as in the world (MU x, y, z on Babylon x, z, y) is seen as the
 * original's item camera sees its eye space: x right, y up, looking down -z.
 */
export type IconView = {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
};

export type IconSubject = { dispose(): void };

export type IconShotJob = {
  /** The cache key: one picture per key. */
  readonly key: string;
  readonly view: IconView;
  /** Puts the model under `root`; null when there is nothing to draw. */
  build(root: TransformNode): Promise<IconSubject | null>;
  /** A spin's turn of the built model at `ms` (milliseconds), written in place. */
  readonly turn?: (ms: number) => void;
};

export type IconShotIo = {
  read(rtt: RenderTargetTexture, view: IconView): Promise<ArrayBufferView | null>;
  encode(pixels: Uint8ClampedArray, width: number, height: number): Promise<string>;
  /** The target's pixels into `out` at once: a spin reads every frame. */
  readNow(rtt: RenderTargetTexture, view: IconView, out: Uint8Array): void;
};

export type IconShots = {
  shoot(job: IconShotJob): Promise<string | null>;
  /**
   * Draws `job` turned every frame and hands `paint` the picture, always in the same kept array,
   * until the returned stop is called. A new spin stops the one before.
   */
  spin(job: IconShotJob, paint: (pixels: Uint8ClampedArray) => void): () => void;
  /** Drops every kept picture: the next shoot of a key draws it again. */
  forget(): void;
};

/** The engine's synchronous read (`engine.readTexture.js`): `readPixels` wraps it in a promise a call. */
type SyncRead = {
  _readTexturePixelsSync(texture: unknown, width: number, height: number, face: number, level: number, out: Uint8Array): void;
};

/** The shot's own light: the original draws a bag item at `Light = 1,1,1` with `LightEnable` off (ZzzInventory.cpp:9682-9699). */
const WHITE = new Vector3(1, 1, 1);
const CLEAR = new Color4(0, 0, 0, 0);

const BROWSER_IO: IconShotIo = {
  read: rtt => rtt.readPixels() ?? Promise.resolve(null),
  encode: async (pixels, width, height) => {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')?.putImageData(new ImageData(pixels, width, height), 0, 0);
    return URL.createObjectURL(await canvas.convertToBlob({ type: 'image/png' }));
  },
  readNow: (rtt, view, out) => {
    const engine = rtt.getScene()?.getEngine() as unknown as SyncRead | undefined;
    engine?._readTexturePixelsSync(rtt.getInternalTexture(), view.width, view.height, -1, 0, out);
  },
};

/** `255 * (v / 255) ^ (1 / 2.2)` for every byte: a linear read put on the display curve. */
const DISPLAY = Float64Array.from({ length: 256 }, (_, v) => 255 * (v / 255) ** (1 / 2.2));

/**
 * A read-back target as an image: rows flipped top-down and the premultiplied colour over the clear
 * (an additive glow leaves the cleared alpha at 0) made straight alpha, exact over black. A linear
 * frame buffer (image processing in post) is put on the display curve first. `out` is rewritten
 * whole when given (a spin's kept buffer).
 */
export function iconPixels(
  read: Uint8Array,
  width: number,
  height: number,
  linear: boolean,
  out = new Uint8ClampedArray(width * height * 4)
): Uint8ClampedArray {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((height - 1 - y) * width + x) * 4;
      const o = (y * width + x) * 4;
      let r = read[i];
      let g = read[i + 1];
      let b = read[i + 2];
      if (linear) {
        r = DISPLAY[r];
        g = DISPLAY[g];
        b = DISPLAY[b];
      }
      const a = Math.max(read[i + 3], r, g, b);
      if (a === 0) {
        out[o] = 0;
        out[o + 1] = 0;
        out[o + 2] = 0;
        out[o + 3] = 0;
        continue;
      }
      out[o] = (r * 255) / a;
      out[o + 1] = (g * 255) / a;
      out[o + 2] = (b * 255) / a;
      out[o + 3] = a;
    }
  }
  return out;
}

/** A subject on its own stage: the root it is built under, its camera and target. */
type Stage = {
  readonly job: IconShotJob;
  root: TransformNode | null;
  subject: IconSubject | null;
  camera: TargetCamera | null;
  rtt: RenderTargetTexture | null;
  frames: number;
};

type Shot = Stage & {
  readonly resolve: (url: string | null) => void;
  drawn: boolean;
};

/** A texture bound per mesh (the item materials' `metadata.diffuseTexture`) that has not arrived yet. */
function texturesReady(rtt: RenderTargetTexture): boolean {
  for (const mesh of rtt.renderList ?? []) {
    const texture = mesh.metadata?.diffuseTexture as BaseTexture | undefined;
    if (typeof texture?.isReady === 'function' && !texture.isReady()) return false;
  }
  return true;
}

export function createIconShots(scene: Scene, io: IconShotIo = BROWSER_IO): IconShots {
  const cache = new Map<string, Promise<string | null>>();
  const queue: Shot[] = [];
  let current: Shot | null = null;
  let observer: Observer<Scene> | null = null;

  function next(): void {
    if (current) return;
    const shot = queue.shift();
    if (!shot) {
      if (observer) scene.onAfterRenderObservable.remove(observer);
      observer = null;
      return;
    }
    current = shot;
    void build(shot);
  }

  let spinning: (() => void) | null = null;

  /** The stage's target, camera, subject and root, freed. */
  function free(stage: Stage): void {
    stage.rtt?.dispose();
    stage.camera?.dispose();
    stage.subject?.dispose();
    stage.root?.dispose();
    stage.rtt = null;
    stage.camera = null;
    stage.subject = null;
    stage.root = null;
  }

  function finish(shot: Shot, url: string | null): void {
    free(shot);
    shot.resolve(url);
    current = null;
    next();
  }

  function rootFor(stage: Stage): TransformNode {
    const root = new TransformNode('itemIconRoot', scene);
    root.rotation.x = -Math.PI / 2;
    stage.root = root;
    return root;
  }

  /** Ready to draw, or waited for long enough. */
  function drawable(stage: Stage, rtt: RenderTargetTexture): boolean {
    return (rtt.isReadyForRendering() && texturesReady(rtt)) || ++stage.frames >= READY_FRAMES;
  }

  async function build(shot: Shot): Promise<void> {
    const root = rootFor(shot);
    try {
      shot.subject = await shot.job.build(root);
    } catch (error) {
      console.warn(`Item icon ${shot.job.key} could not be built:`, error);
    }
    if (!shot.subject) {
      finish(shot, null);
      return;
    }
    prepare(shot, root);
    observer ??= scene.onAfterRenderObservable.add(tick);
  }

  /** Out of every other view and pass, flat lit, then a camera and target of its own. */
  function prepare(shot: Stage, root: TransformNode): void {
    const meshes = root.getChildMeshes(false);
    for (const mesh of meshes) {
      mesh.layerMask = ICON_LAYER;
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.applyFog = false;
      mesh.receiveShadows = false;
      mesh.isPickable = false;
      mesh.metadata ??= {};
      mesh.metadata.csmCaster = false;
      mesh.metadata.depthOccluder = false;
      mesh.metadata.bodyLight = WHITE;
      if (!mesh.metadata.brightMesh) {
        const flat = getFlatLitVariant(scene, mesh);
        if (flat) mesh.material = flat;
      }
    }

    const { view } = shot.job;
    const camera = new TargetCamera('itemIconCamera', Vector3.Zero(), scene, false);
    camera.mode = TargetCamera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = view.left;
    camera.orthoRight = view.right;
    camera.orthoBottom = view.bottom;
    camera.orthoTop = view.top;
    camera.minZ = 0.01;
    camera.maxZ = 100;
    camera.layerMask = ICON_LAYER;

    const rtt = new RenderTargetTexture('itemIcon', { width: view.width, height: view.height }, scene, false);
    rtt.activeCamera = camera;
    rtt.renderList = meshes;
    rtt.clearColor = CLEAR;
    shot.camera = camera;
    shot.rtt = rtt;
  }

  /** After the frame: the current subject, once it is ready, drawn and read back. */
  function tick(): void {
    const shot = current;
    const rtt = shot?.rtt;
    if (!shot || !rtt || shot.drawn) return;
    if (!drawable(shot, rtt)) return;

    shot.drawn = true;
    rtt.render();
    const { view } = shot.job;
    const linear = scene.imageProcessingConfiguration.applyByPostProcess;
    io.read(rtt, view)
      .then(read =>
        read
          ? io.encode(iconPixels(new Uint8Array(read.buffer, read.byteOffset, read.byteLength), view.width, view.height, linear), view.width, view.height)
          : null
      )
      .catch(error => {
        console.warn(`Item icon ${shot.job.key} could not be read:`, error);
        return null;
      })
      .then(url => finish(shot, url));
  }

  return {
    shoot(job) {
      const cached = cache.get(job.key);
      if (cached) return cached;
      const pending = new Promise<string | null>(resolve => {
        queue.push({ job, resolve, root: null, subject: null, camera: null, rtt: null, frames: 0, drawn: false });
      });
      cache.set(job.key, pending);
      next();
      return pending;
    },

    forget() {
      cache.clear();
    },

    spin(job, paint) {
      spinning?.();
      const stage: Stage = { job, root: null, subject: null, camera: null, rtt: null, frames: 0 };
      const { view } = job;
      const read = new Uint8Array(view.width * view.height * 4);
      const pixels = new Uint8ClampedArray(read.length);
      let stopped = false;
      let frame: Observer<Scene> | null = null;

      const stop = (): void => {
        if (stopped) return;
        stopped = true;
        if (spinning === stop) spinning = null;
        if (frame) scene.onAfterRenderObservable.remove(frame);
        frame = null;
        free(stage);
      };
      spinning = stop;

      /** After the frame: turned, drawn and read into the kept buffers. */
      const draw = (): void => {
        const rtt = stage.rtt;
        if (!rtt || !drawable(stage, rtt)) return;
        stage.frames = READY_FRAMES;
        job.turn?.(performance.now());
        rtt.render();
        io.readNow(rtt, view, read);
        paint(iconPixels(read, view.width, view.height, scene.imageProcessingConfiguration.applyByPostProcess, pixels));
      };

      const root = rootFor(stage);
      job.build(root).then(
        subject => {
          if (stopped) {
            subject?.dispose();
            return;
          }
          stage.subject = subject;
          if (!subject) {
            stop();
            return;
          }
          prepare(stage, root);
          frame = scene.onAfterRenderObservable.add(draw);
        },
        error => {
          if (!stopped) console.warn(`Item icon ${job.key} could not be built:`, error);
          stop();
        }
      );
      return stop;
    },
  };
}

const perScene = new WeakMap<Scene, IconShots>();

/** The scene's shot queue, made on first use. */
export function iconShots(scene: Scene): IconShots {
  let shots = perScene.get(scene);
  if (!shots) {
    shots = createIconShots(scene);
    perScene.set(scene, shots);
  }
  return shots;
}
