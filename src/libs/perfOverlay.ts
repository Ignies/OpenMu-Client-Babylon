import type { Scene } from './babylon/exports';
import { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
import { netStats } from './netStats';
import { GameOptions } from '../common/gameOptions';
import { renderScaleForStep } from './renderScale';
import { upscaleActive } from '../scenes/upscale';
import { frameGenState } from '../scenes/frameGen';
import { texturePacks } from '../common/texturePacks';
import { propBatchStats } from '../common/propBatches';
import { configFingerprintLines } from '../common/configFingerprint';

/**
 * Render-budget overlay. Shift+Ctrl+Alt+P toggles it.
 *
 * Nothing here runs while it is hidden: `record` is a no-op, the sampler is
 * not installed, and no per-frame allocation happens. The point is to be able
 * to answer "what did that change actually cost" without guessing - the
 * per-system column is usually the surprise.
 */

let visible = false;

/** Rolling average of each ECS system's update, in milliseconds. */
const systemMs = new Map<string, number>();

/** Weight of the newest sample in the rolling average. */
const SMOOTHING = 0.1;

export function perfOverlayVisible(): boolean {
  return visible;
}

/**
 * The worst single tick each system has had since the overlay was opened.
 *
 * The rolling average beside it answers "what costs the most all the time",
 * which is the wrong question for a stutter: the system that ate 40 ms once
 * is back under a millisecond by the time you have finished blinking, and
 * the average has already forgotten it. A high-water mark keeps the culprit
 * on screen until something actually beats it. Cleared when the overlay is
 * opened, so the readings are from the stretch you are looking at and not
 * from the map load.
 */
const systemPeakMs = new Map<string, number>();

export function recordSystemTime(name: string, ms: number): void {
  const previous = systemMs.get(name);
  systemMs.set(
    name,
    previous === undefined ? ms : previous + (ms - previous) * SMOOTHING
  );

  if (ms > (systemPeakMs.get(name) ?? 0)) systemPeakMs.set(name, ms);
}

let frameMs = 0;
let updateMs = 0;
let cpuMs = 0;

/**
 * The graph's history: one slot a frame, oldest overwritten.
 *
 * ~4 seconds at 60 fps, which is long enough to still be looking at a hitch
 * after feeling one. Written on every frame whether or not the overlay is up
 * - it is three array stores, and a graph that only starts recording when
 * you open it would never catch the stutter that made you open it.
 */
const HISTORY = 240;
const histFrame = new Float32Array(HISTORY);
const histCpu = new Float32Array(HISTORY);
const histGpu = new Float32Array(HISTORY);
let histAt = 0;
let histCount = 0;

export function recordFrame(
  totalUpdateMs: number,
  deltaMs: number,
  totalCpuMs = totalUpdateMs
): void {
  updateMs += (totalUpdateMs - updateMs) * SMOOTHING;
  frameMs += (deltaMs - frameMs) * SMOOTHING;
  cpuMs += (totalCpuMs - cpuMs) * SMOOTHING;

  histFrame[histAt] = deltaMs;
  histCpu[histAt] = totalCpuMs;
  histGpu[histAt] = gpuFrameMs;
  histAt = (histAt + 1) % HISTORY;
  if (histCount < HISTORY) histCount++;
}

/**
 * Real GPU milliseconds for the last frame, from the timer-query extension.
 *
 * `EngineInstrumentation` is imported rather than reached for through the
 * engine so the production bundle cannot tree-shake the capture away, which
 * is exactly what left GPU time reading empty on a built client before.
 * Started with the overlay and stopped with it: a timer query per frame is
 * not free, and nobody is reading it while the overlay is hidden.
 */
let instrumentation: EngineInstrumentation | null = null;
let gpuFrameMs = 0;

function startGpuTimer(scene: Scene): void {
  if (instrumentation) return;

  try {
    instrumentation = new EngineInstrumentation(scene.getEngine());
    instrumentation.captureGPUFrameTime = true;
  } catch {
    instrumentation = null;
  }
}

function stopGpuTimer(): void {
  try {
    instrumentation?.dispose();
  } catch {
    // Disposing a half-built instrumentation must not take the game with it.
  }

  instrumentation = null;
  gpuFrameMs = 0;
}

function sampleGpuTime(): void {
  if (!instrumentation) return;

  // Nanoseconds, and it stays at its last reading between captures.
  const ns = instrumentation.gpuFrameTimeCounter?.current ?? 0;

  gpuFrameMs = ns > 0 ? ns / 1e6 : 0;
}

let element: HTMLPreElement | null = null;
let wrapper: HTMLDivElement | null = null;
let graph: HTMLCanvasElement | null = null;

const GRAPH_H = 68;

function ensureElement(): HTMLPreElement {
  if (element) return element;

  wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'top:8px',
    'right:8px',
    'z-index:9999',
    'padding:8px 10px',
    'background:rgba(0,0,0,0.72)',
    'color:#b9f6c9',
    'pointer-events:none',
    'border:1px solid rgba(255,255,255,0.15)',
    'border-radius:3px',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'OMCB: Performance Overlay';
  title.style.cssText = [
    'margin:0 0 4px',
    'text-align:right',
    'font:bold 10px ui-monospace,Consolas,monospace',
    'letter-spacing:0.5px',
    'color:rgba(185,246,201,0.65)',
  ].join(';');

  element = document.createElement('pre');
  element.style.cssText = [
    'margin:0',
    'font:11px/1.35 ui-monospace,Consolas,monospace',
    'white-space:pre',
  ].join(';');

  graph = document.createElement('canvas');
  graph.height = GRAPH_H;
  // Full width of the readout above it; the backing store is matched to
  // that width on each draw so the columns stay crisp.
  graph.style.cssText = `display:block;margin-top:6px;width:100%;height:${GRAPH_H}px`;

  wrapper.appendChild(title);
  wrapper.appendChild(element);
  wrapper.appendChild(graph);
  document.body.appendChild(wrapper);

  return element;
}

/** A frame at 60 and at 30, as the two lines worth seeing against. */
const MS_60 = 1000 / 60;
const MS_30 = 1000 / 30;

/**
 * Frame time as bars, with the main thread and the GPU drawn over them as
 * lines, so a hitch can be read for what caused it: a tall bar with a tall
 * CPU line is our own work, a tall bar with a tall GPU line is the card, and
 * a tall bar with neither is the browser (a garbage collection, a texture
 * upload, the compositor).
 */
const CPU_COLOUR = '#78c8ff';
const GPU_COLOUR = '#ff78dc';
const BAR_OK = '#4fd98a';
const BAR_SLOW = '#ffb45a';
const BAR_BAD = '#ff6b6b';

/** Room at the top of the canvas for the legend, above the plot. */
const LEGEND_H = 13;

function drawGraph(): void {
  const canvas = graph;
  const ctx = canvas?.getContext('2d');

  if (!canvas || !ctx) return;

  // Match the backing store to the width the readout above it actually
  // takes, so the columns are crisp instead of a 240 px strip stretched.
  const w = Math.max(120, Math.round(canvas.clientWidth));
  if (canvas.width !== w) canvas.width = w;

  const h = GRAPH_H;
  const top = LEGEND_H;
  const plot = h - top;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, top, w, plot);

  // Scale to the worst frame on screen, never tighter than a 30 fps frame,
  // so the normal range is not flattened and a spike is never clipped.
  let worst = MS_30;
  for (let i = 0; i < histCount; i++) {
    if (histFrame[i] > worst) worst = histFrame[i];
  }

  const y = (ms: number) => top + plot - Math.min(1, ms / worst) * plot;

  for (const [ms, colour] of [
    [MS_60, 'rgba(120,255,160,0.35)'],
    [MS_30, 'rgba(255,180,90,0.35)'],
  ] as const) {
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, y(ms) + 0.5);
    ctx.lineTo(w, y(ms) + 0.5);
    ctx.stroke();
  }

  // Oldest on the left: walk the ring from the next slot to be written.
  const start = histCount < HISTORY ? 0 : histAt;
  const columns = Math.min(histCount, HISTORY);
  const step = columns > 0 ? w / columns : w;

  for (let i = 0; i < columns; i++) {
    const slot = (start + i) % HISTORY;
    const ms = histFrame[slot];

    // Under vsync a missed frame doubles to almost exactly 33.3 ms, so the
    // red threshold sits a little past it: one dropped refresh reads amber,
    // and red is kept for frames that are genuinely worse than 30 a second.
    ctx.fillStyle =
      ms > MS_30 * 1.1 ? BAR_BAD : ms > MS_60 * 1.1 ? BAR_SLOW : BAR_OK;
    const barTop = y(ms);
    ctx.fillRect(i * step, barTop, Math.max(1, step), h - barTop);
  }

  const line = (data: Float32Array, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < columns; i++) {
      const slot = (start + i) % HISTORY;
      const py = y(data[slot]);
      const px = i * step + step / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  line(histCpu, CPU_COLOUR);
  if (instrumentation) line(histGpu, GPU_COLOUR);

  drawLegend(ctx, w, worst);
}

/** Which colour is which, and what the top of the plot is worth. */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  w: number,
  worst: number
): void {
  ctx.font = '9px ui-monospace,Consolas,monospace';
  ctx.textBaseline = 'middle';

  const mid = LEGEND_H / 2;
  let x = 1;

  const key = (colour: string, label: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(x, mid - 1.5, 7, 3);
    x += 10;
    ctx.fillStyle = 'rgba(220,240,230,0.85)';
    ctx.fillText(label, x, mid);
    x += ctx.measureText(label).width + 8;
  };

  // The bars are one series in three colours, so all three are named: a bar
  // is what the frame took, and its colour is which side of 60 and 30 it
  // fell. The lines are the two halves of that time.
  key(BAR_OK, '60+');
  key(BAR_SLOW, 'dropped');
  key(BAR_BAD, 'under 30');
  key(CPU_COLOUR, 'cpu');
  if (instrumentation) key(GPU_COLOUR, 'gpu');

  // The ceiling, so a bar's height can be turned back into milliseconds.
  const scale = `${worst.toFixed(0)} ms`;
  ctx.fillStyle = 'rgba(220,240,230,0.55)';
  ctx.fillText(scale, Math.max(x, w - ctx.measureText(scale).width - 1), mid);
}

/**
 * GPU milliseconds, plus the worst frame in the window the graph covers.
 * The timer query is an extension: where it is missing the row says so
 * rather than printing a zero that reads like "the GPU does nothing".
 */
function gpuMsLine(): string {
  let worst = 0;
  for (let i = 0; i < histCount; i++) {
    if (histFrame[i] > worst) worst = histFrame[i];
  }

  const gpu = !instrumentation
    ? 'unavailable'
    : gpuFrameMs > 0
      ? `${gpuFrameMs.toFixed(2)} ms`
      : 'warming up';

  return `gpu time   ${gpu}   worst frame ${worst.toFixed(1)} ms`;
}

/**
 * Every setting the player has, as hex, so a screenshot of this overlay
 * carries the configuration that produced it. `configuration_hex.md` is the
 * table that reads it back.
 */
function configLines(): string[] {
  const chunks = configFingerprintLines(48);

  return chunks.map((chunk, i) => {
    const grouped = chunk.replace(/(.{8})(?=.)/g, '$1 ');

    return i === 0 ? `config     ${grouped}` : `           ${grouped}`;
  });
}

function pad(label: string, width: number): string {
  return label.length >= width ? label : label + ' '.repeat(width - label.length);
}

function countPlayingAnimations(scene: Scene): number {
  let playing = 0;
  for (const group of scene.animationGroups) if (group.isPlaying) playing++;
  return playing;
}

function countEnabledMeshes(scene: Scene): number {
  let enabled = 0;
  for (const mesh of scene.meshes) if (mesh.isEnabled(false)) enabled++;
  return enabled;
}

const SYSTEM_ROWS = 8;

function propLine(): string {
  const s = propBatchStats();
  if (!s) return 'props      none batched';
  return `props      ${s.instances} in ${s.meshes} meshes / ${s.types} types${
    s.pending ? ` (${s.pending} loading)` : ''
  }, ${s.excluded.size} types per object`;
}

let gpuName: string | null = null;

/** A string that actually names an adapter, rather than a browser. */
function namesAnAdapter(s: string): boolean {
  return /NVIDIA|GeForce|RTX|GTX|AMD|Radeon|Intel|Iris|UHD|Apple|Mali|Adreno|PowerVR|llvmpipe|SwiftShader/i.test(
    s
  );
}

/**
 * A second source for the adapter name, asked of WebGPU rather than WebGL.
 *
 * Brave and Firefox answer WebGL's renderer query with the browser's own name
 * to resist fingerprinting, which leaves the row reading "Brave" and hides
 * the thing that matters most on a laptop: whether the page landed on the
 * discrete chip or the integrated one, which is a 3x frame. WebGPU's adapter
 * info is a different gate and is often still answered. Asked once, in the
 * background, and only used when WebGL's answer was not a real adapter.
 */
let gpuFromAdapter: string | null = null;

/**
 * The fast adapter the machine has, when it is not the one in use.
 *
 * WebGPU will hand out an adapter per power preference, so asking for both
 * and comparing them is how a page finds out there are two chips at all.
 * A laptop that answers "high-performance" with a different card from the
 * one WebGL is drawing on is a laptop rendering the game on its integrated
 * chip while a much faster one sits idle - worth saying out loud, because
 * it is the single largest difference in frame rate there is and nothing on
 * screen hints at it.
 */
let gpuIdleFast: string | null = null;

type AdapterInfo = Record<string, string>;
type Adapter = {
  info?: AdapterInfo;
  requestAdapterInfo?: () => Promise<AdapterInfo>;
};
type Gpu = {
  requestAdapter?: (options?: {
    powerPreference?: 'high-performance' | 'low-power';
  }) => Promise<Adapter | null>;
};

/** The most specific name in an adapter's report, or null. */
function adapterName(info: AdapterInfo | undefined): string | null {
  if (!info) return null;

  const parts = [info.description, info.device, info.architecture, info.vendor]
    .filter(Boolean)
    .map(s => String(s).trim())
    .filter(s => s.length > 0);

  const named = parts.find(namesAnAdapter) ?? parts[0];

  return named ? named.slice(0, 60) : null;
}

async function askAdapter(
  gpu: Gpu | undefined,
  powerPreference?: 'high-performance' | 'low-power'
): Promise<string | null> {
  try {
    const adapter = await gpu?.requestAdapter?.(
      powerPreference ? { powerPreference } : undefined
    );

    return adapterName(adapter?.info ?? (await adapter?.requestAdapterInfo?.()));
  } catch {
    return null;
  }
}

async function probeAdapterName(): Promise<void> {
  const gpu = (navigator as unknown as { gpu?: Gpu }).gpu;

  gpuFromAdapter = await askAdapter(gpu);

  const [fast, slow] = await Promise.all([
    askAdapter(gpu, 'high-performance'),
    askAdapter(gpu, 'low-power'),
  ]);

  // Only interesting when the two really are different chips. Plenty of
  // machines answer both preferences with the same adapter, and a desktop
  // with one card must not be told it is wasting a second one.
  if (!fast || !slow || fast === slow) {
    gpuIdleFast = null;
    return;
  }

  // What is actually drawing: WebGL's own answer where it is readable, and
  // the plain adapter otherwise.
  const inUse = namesAnAdapter(gpuName ?? '') ? gpuName! : gpuFromAdapter;

  gpuIdleFast = inUse && sameChip(inUse, fast) ? null : fast;
}

/**
 * Whether two adapter names are the same piece of hardware. The strings come
 * from different APIs and are rarely identical ("NVIDIA GeForce RTX 5070
 * Laptop GPU" against "nvidia"), so the test is on the maker plus any model
 * number either side carries.
 */
function sameChip(a: string, b: string): boolean {
  const key = (s: string) => {
    const low = s.toLowerCase();
    const maker = /nvidia|geforce/.test(low)
      ? 'nvidia'
      : /amd|radeon/.test(low)
        ? 'amd'
        : /intel|iris|uhd/.test(low)
          ? 'intel'
          : /apple/.test(low)
            ? 'apple'
            : low.slice(0, 8);
    return maker;
  };

  return key(a) === key(b);
}

/**
 * The adapter the page landed on: a two-GPU laptop hands the browser the
 * integrated one unless told otherwise, and that is a 4x slower frame.
 */
function gpuLines(scene: Scene): string[] {
  if (gpuName === null) {
    try {
      const engine = scene.getEngine() as unknown as {
        getGlInfo?: () => { vendor: string; renderer: string };
      };
      const info = engine.getGlInfo?.();
      const raw = info?.renderer || info?.vendor || '?';
      // ANGLE reports "ANGLE (vendor, name (0x1234) Direct3D11 ...)".
      const angle = /^ANGLE \((?:[^,]*, )?(.*?)(?: \(0x[0-9A-Fa-f]+\))? Direct3D/.exec(raw);
      gpuName = (angle ? angle[1] : raw).slice(0, 60);
    } catch {
      gpuName = '?';
    }
  }

  const lines: string[] = [];

  if (namesAnAdapter(gpuName)) lines.push(`gpu        ${gpuName}`);
  else if (gpuFromAdapter) lines.push(`gpu        ${gpuFromAdapter} (WebGPU)`);
  // Both gates closed. Say so rather than printing "Brave" as if it were a
  // graphics card; brave://gpu or chrome://gpu still has the real name.
  else lines.push(`gpu        ${gpuName}: hidden, see brave://gpu`);

  if (gpuIdleFast) {
    lines.push(`  IDLE     ${gpuIdleFast} is present and not being used`);
  }

  return lines;
}

/**
 * Draw calls for the last frame.
 *
 * `engine._drawCalls` counts up for the life of the page and nothing ever
 * resets it on the WebGL engine (`addCount(n, false)`, and `fetchNewFrame`
 * is never called), so printing it raw showed a number in the millions that
 * reads exactly like a per-frame count and is not one. Only the difference
 * between two frames means anything.
 */
let drawCallsTotal = -1;
let drawCallsPerFrame = 0;

function sampleDrawCalls(scene: Scene): void {
  const total =
    (scene.getEngine() as unknown as { _drawCalls?: { current: number } })
      ._drawCalls?.current ?? -1;

  if (total < 0) return;

  // The first sample after the overlay opens has no previous frame to
  // subtract from, and would land the whole session's total in the average.
  if (drawCallsTotal >= 0) {
    const delta = total - drawCallsTotal;
    drawCallsPerFrame += (delta - drawCallsPerFrame) * SMOOTHING;
  }

  drawCallsTotal = total;
}

/**
 * The socket's share of the frame. `held` is the number that answers "is the
 * server costing me frames": it is milliseconds a second spent inside the
 * message handler, which is time the browser could not draw in. Against a
 * healthy server it is a fraction of a millisecond; a server delivering in
 * bursts shows up as a large `worst` and a `bursts` count, which is felt as
 * dropped frames rather than as lag.
 */
function netLine(): string {
  const n = netStats();

  if (!n.live) return 'net        offline';

  return (
    `net        ${n.rate.toFixed(0)}/s  ${n.kbps.toFixed(1)} KB/s  ` +
    `held ${n.msPerSecond.toFixed(2)} ms/s  worst ${n.worstMs.toFixed(1)} ms` +
    (n.bursts ? `  bursts ${n.bursts}` : '')
  );
}

/**
 * Frame generation's state, when it is on: whether the machine it is running
 * on is one that gains from it. A tester turning the box on wants to know
 * which of the two cases they are in, and the frame counter alone will not
 * say - the presented rate rises either way (`scenes/frameGen.ts`).
 */
function frameGenLine(): string {
  const fg = frameGenState();

  if (!fg.on) return '';

  return ` / fgen ${fg.favourable ? 'gains' : 'costs'} (cpu ${Math.round(
    (100 * fg.costMs) / Math.max(fg.intervalMs, 0.01)
  )}% of ${Math.round(fg.intervalMs)}ms)`;
}

/**
 * The settings that actually drive what a frame costs, on one line.
 *
 * Every one of these lives in `localStorage`, which the browser keeps *per
 * origin*: the same build served from two addresses is two independent sets
 * of settings. So "it runs worse on the live site than it does locally" is
 * most often two different qualities, two different render distances or two
 * different texture packs being compared, and there was no way to see that
 * without opening both options windows side by side.
 */
function settingsLine(): string {
  const pack = texturePacks.activeId;

  return (
    `settings   light ${GameOptions.lightingQuality} / mat ${
      GameOptions.materialQuality
    } / detail ${GameOptions.materialDetail} / dist ${
      GameOptions.renderDistance
    } / scale ${Math.round(renderScaleForStep(GameOptions.renderScale) * 100)}%${
      upscaleActive() ? ' fsr' : ''
    }${frameGenLine()}` +
    (pack ? ` / pack ${pack}` : '')
  );
}

function render(scene: Scene): void {
  const engine = scene.getEngine();

  const slowest = [...systemMs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SYSTEM_ROWS);

  const peaks = [...systemPeakMs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SYSTEM_ROWS);

  const NAME_W = 19;
  const cell = (row: [string, number] | undefined) =>
    row
      ? `  ${pad(row[0].slice(0, NAME_W), NAME_W)}${row[1].toFixed(2).padStart(6)}`
      : ' '.repeat(2 + NAME_W + 6);

  const systemRows = [
    `${pad('slowest now (ms)', 2 + NAME_W + 6)}  worst since opened`,
    ...Array.from({ length: SYSTEM_ROWS }, (_, i) =>
      `${cell(slowest[i])}  ${cell(peaks[i])}`.trimEnd()
    ).filter(line => line.length > 0),
  ];

  const lines = [
    ...gpuLines(scene),
    `fps        ${engine.getFps().toFixed(0)}`,
    `frame      ${frameMs.toFixed(2)} ms`,
    `cpu        ${cpuMs.toFixed(2)} ms   ecs ${updateMs.toFixed(2)} ms`,
    gpuMsLine(),
    `draw calls ${drawCallsTotal < 0 ? '?' : drawCallsPerFrame.toFixed(0)} a frame`,
    `meshes     ${scene.getActiveMeshes().length} act / ${
      countEnabledMeshes(scene)
    } on / ${scene.meshes.length} total`,
    `tris       ${(scene.getActiveIndices() / 3) | 0}`,
    `anims      ${countPlayingAnimations(scene)} playing / ${
      scene.animationGroups.length
    }`,
    `particles  ${scene.particleSystems.length}`,
    `lights     ${scene.lights.length}`,
    settingsLine(),
    netLine(),
    propLine(),
    `materials  ${scene.materials.length}   textures ${scene.textures.length}`,
    ...configLines(),
    '',
    ...systemRows,
  ];

  ensureElement().textContent = lines.join('\n');

  drawGraph();
}

/**
 * Installs the toggle and the once-per-frame refresh. Safe to call once at
 * startup; the overlay stays dormant until the chord is pressed.
 */
export function installPerfOverlay(scene: Scene): void {
  window.addEventListener('keydown', ev => {
    // Shift+Ctrl+Alt+P - same shape as the Babylon inspector chord.
    if (!ev.shiftKey || !ev.ctrlKey || !ev.altKey) return;
    if (ev.code !== 'KeyP') return;

    ev.preventDefault();

    visible = !visible;

    if (!visible) {
      if (wrapper) wrapper.style.display = 'none';
      // The timer query costs a little every frame; nobody is reading it now.
      stopGpuTimer();
      return;
    }

    systemMs.clear();
    systemPeakMs.clear();
    // The draw-call average is a difference between frames, and the frames
    // either side of a hidden overlay are not next to each other.
    drawCallsTotal = -1;
    drawCallsPerFrame = 0;

    startGpuTimer(scene);
    void probeAdapterName();

    ensureElement();
    if (wrapper) wrapper.style.display = 'block';
  });

  let sinceRefresh = 0;

  scene.onAfterRenderObservable.add(() => {
    if (!visible) return;

    // The readout is for reading, not for animating: 5 Hz is plenty and keeps
    // the overlay's own cost (two scene walks) off the frame budget.
    sampleGpuTime();
    sampleDrawCalls(scene);

    sinceRefresh += scene.getEngine().getDeltaTime();
    if (sinceRefresh < 200) return;
    sinceRefresh = 0;

    render(scene);
  });
}
