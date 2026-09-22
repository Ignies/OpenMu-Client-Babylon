import {
  Engine,
  Scene,
  type Node,
  Animation,
  Color3,
  Vector3,
  Matrix,
  Quaternion,
  type Viewport,
} from './exports';
import { devQuery } from '../../common/devSeams';

export function findInChildren(children: Node[], name: string): Node | null {
  for (const child of children) {
    if (child.name === name) return child;

    const res = findInChildren(child.getChildren(), name);

    if (res) return res;
  }

  return null;
}

export async function addInspectorForScene(scene: Scene) {
  const switchDebugLayer = () => {
    //@ts-ignore
    if (scene.debugLayer.isVisible()) {
      //@ts-ignore
      scene.debugLayer.hide();
    } else {
      //@ts-ignore
      scene.debugLayer.show({ overlay: true });
    }
  };

  // hide/show the Inspector
  window.addEventListener('keydown', async ev => {
    // Shift+Ctrl+Alt+I
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
      const debuggerScript = document.querySelector('script[inspector]');

      if (!debuggerScript) {
        console.log(`Start loading inspector...`);
        const s = document.createElement('script');
        s.setAttribute('inspector', 'true');
        s.src =
          'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js';

        s.onload = () => {
          console.log(`Inspector loaded!`);
          switchDebugLayer();
        };
        s.onerror = () => {
          console.log(`Inspector failed to load`);
        };
        document.body.appendChild(s);
        return;
      }

      switchDebugLayer();
    }
  });
}

/**
 * ANGLE cannot abandon a link in flight, so deleting a program that is still
 * compiling blocks the GPU process until the compile ends: a second or more
 * when a map is unloaded right after it loaded. Such a program is deleted
 * once its compile completes instead.
 */
function deferDeletingCompilingPrograms(engine: Engine): void {
  // `?programDelete=now`: delete at once, as Babylon does, for the A/B.
  if (devQuery('programDelete') === 'now') return;

  const gl = engine._gl;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  if (!parallel) return;

  type PipelineContext = Parameters<Engine['_deletePipelineContext']>[0];
  const remove = engine._deletePipelineContext.bind(engine);
  const waiting: PipelineContext[] = [];

  const compiling = (context: PipelineContext): boolean => {
    const program = (context as unknown as { program?: WebGLProgram | null })
      .program;
    return (
      !!program &&
      !gl.isContextLost() &&
      !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)
    );
  };

  engine._deletePipelineContext = (context: PipelineContext) => {
    if (compiling(context)) waiting.push(context);
    else remove(context);
  };

  engine.onEndFrameObservable.add(() => {
    for (let i = waiting.length - 1; i >= 0; i--) {
      if (compiling(waiting[i])) continue;
      remove(waiting[i]);
      waiting.splice(i, 1);
    }
  });
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.style.width = '400';
  canvas.style.height = '300';
  canvas.width = 400;
  canvas.height = 300;

  return canvas;
}

/**
 * The G-buffer pass keys its shader on `BonesPerMesh` even under BONETEXTURE,
 * where the count is never read, so each bone count linked its own copy of
 * the program. The materials and shadow passes already leave it out there.
 */
function shareGeometryPassAcrossBoneCounts(engine: Engine): void {
  // `?geoBones=1`: one program per bone count, as before, for the A/B.
  if (devQuery('geoBones') === '1') return;

  const original = engine.createEffect.bind(engine) as Engine['createEffect'];

  engine.createEffect = ((...args: Parameters<Engine['createEffect']>) => {
    const [baseName, options] = args;

    if (
      baseName === 'geometry' &&
      !Array.isArray(options) &&
      typeof options.defines === 'string' &&
      options.defines.includes('#define BONETEXTURE true')
    ) {
      options.defines = options.defines.replace(
        /^#define BonesPerMesh \d+\n?/m,
        ''
      );
    }

    return original(...args);
  }) as Engine['createEffect'];
}

export function createEngine(
  baseCanvas?: HTMLCanvasElement,
  enableAntialiasing?: boolean
) {
  // create the canvas html element and attach it to the webpage
  const canvas = baseCanvas || createCanvas();

  // initialize babylon scene and engine
  const shouldScale = true;
  const engine = new Engine(
    canvas,
    !!enableAntialiasing,
    {
      audioEngine: true,
      stencil: true,
      useHighPrecisionFloats: true,
      // Asks the browser for the discrete GPU on dual-GPU machines; 'low-power'
      // explicitly requests the integrated one.
      powerPreference: 'high-performance',
      doNotHandleContextLost: false,
      limitDeviceRatio: enableAntialiasing ? undefined : 1,
      failIfMajorPerformanceCaveat: false,
      premultipliedAlpha: false,
      alpha: false,
      preserveDrawingBuffer: false,
      forceSRGBBufferSupportState: false,
    },
    shouldScale
  );

  if (Engine.audioEngine) {
    Engine.audioEngine.useCustomUnlockedButton = true;
  }

  shareGeometryPassAcrossBoneCounts(engine);

  // WebGL: to support 'flat' varying
  const gl = engine._gl;
  const pvk = gl.getExtension('WEBGL_provoking_vertex');
  if (pvk) {
    pvk.provokingVertexWEBGL(pvk.FIRST_VERTEX_CONVENTION_WEBGL);
  }

  deferDeletingCompilingPrograms(engine);

  return { engine, canvas };
}

export const transformCoordinatesWithClippingToRef = (
  v: Vector3,
  transformation: Matrix,
  ref: Vector3
) => {
  const m = transformation.m;
  let rx = v.x * m[0] + v.y * m[4] + v.z * m[8] + m[12];
  let ry = v.x * m[1] + v.y * m[5] + v.z * m[9] + m[13];
  let rz = v.x * m[2] + v.y * m[6] + v.z * m[10] + m[14];
  let rw = v.x * m[3] + v.y * m[7] + v.z * m[11] + m[15];

  if (rx < -rw) rx = -rw;
  if (rx > rw) rx = rw;
  if (ry < -rw) ry = -rw;
  if (ry > rw) ry = rw;
  if (rz < -rw) rz = -rw;
  if (rz > rw) rz = rw;
  if (rw < 0) {
    rw = 0;
  }

  ref.x = rx / rw;
  ref.y = ry / rw;
  ref.z = rz / rw;

  return ref;
};

const TmpMatrix = Matrix.Identity();

export function projectWorldPositionToScreenRef(
  scene: Scene,
  pos: Vector3,
  viewport: Viewport,
  ref: Vector3
) {
  const projMatrix = scene.getTransformMatrix();
  const projected = transformCoordinatesWithClippingToRef(pos, projMatrix, ref);
  const viewportMatrix = TmpMatrix;

  Matrix.FromValuesToRef(
    viewport.width / 2.0,
    0,
    0,
    0,
    0,
    -viewport.height / 2.0,
    0,
    0,
    0,
    0,
    0.5,
    0,
    viewport.x + viewport.width / 2.0,
    viewport.height / 2.0 + viewport.y,
    0.5,
    1,
    viewportMatrix
  );

  Vector3.TransformCoordinatesToRef(projected, viewportMatrix, ref);

  return ref;
}
