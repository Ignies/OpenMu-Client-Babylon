import type { Scene } from './babylon/exports';

/**
 * Render-budget overlay. Shift+Ctrl+Alt+P toggles it.
 *
 * Nothing here runs while it is hidden: `record` is a no-op, the sampler is
 * not installed, and no per-frame allocation happens. The point is to be able
 * to answer "what did that change actually cost" without guessing — the
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

export function recordSystemTime(name: string, ms: number): void {
  const previous = systemMs.get(name);
  systemMs.set(
    name,
    previous === undefined ? ms : previous + (ms - previous) * SMOOTHING
  );
}

let frameMs = 0;
let updateMs = 0;

export function recordFrame(totalUpdateMs: number, deltaMs: number): void {
  updateMs += (totalUpdateMs - updateMs) * SMOOTHING;
  frameMs += (deltaMs - frameMs) * SMOOTHING;
}

let element: HTMLPreElement | null = null;

function ensureElement(): HTMLPreElement {
  if (element) return element;

  element = document.createElement('pre');
  element.style.cssText = [
    'position:fixed',
    'top:8px',
    'right:8px',
    'z-index:9999',
    'margin:0',
    'padding:8px 10px',
    'background:rgba(0,0,0,0.72)',
    'color:#b9f6c9',
    'font:11px/1.35 ui-monospace,Consolas,monospace',
    'white-space:pre',
    'pointer-events:none',
    'border:1px solid rgba(255,255,255,0.15)',
    'border-radius:3px',
  ].join(';');

  document.body.appendChild(element);

  return element;
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

function render(scene: Scene): void {
  const engine = scene.getEngine();

  // `_drawCalls` is internal but always counted; fall back quietly.
  const drawCalls =
    (engine as unknown as { _drawCalls?: { current: number } })._drawCalls
      ?.current ?? -1;

  const slowest = [...systemMs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SYSTEM_ROWS);

  const lines = [
    `fps        ${engine.getFps().toFixed(0)}`,
    `frame      ${frameMs.toFixed(2)} ms`,
    `ecs        ${updateMs.toFixed(2)} ms`,
    `draw calls ${drawCalls < 0 ? '?' : drawCalls}`,
    `meshes     ${scene.getActiveMeshes().length} act / ${
      countEnabledMeshes(scene)
    } on / ${scene.meshes.length} total`,
    `tris       ${(scene.getActiveIndices() / 3) | 0}`,
    `anims      ${countPlayingAnimations(scene)} playing / ${
      scene.animationGroups.length
    }`,
    `particles  ${scene.particleSystems.length}`,
    `lights     ${scene.lights.length}`,
    `materials  ${scene.materials.length}   textures ${scene.textures.length}`,
    '',
    'slowest systems',
    ...slowest.map(([name, ms]) => `  ${pad(name, 26)}${ms.toFixed(2)}`),
  ];

  ensureElement().textContent = lines.join('\n');
}

/**
 * Installs the toggle and the once-per-frame refresh. Safe to call once at
 * startup; the overlay stays dormant until the chord is pressed.
 */
export function installPerfOverlay(scene: Scene): void {
  window.addEventListener('keydown', ev => {
    // Shift+Ctrl+Alt+P — same shape as the Babylon inspector chord.
    if (!ev.shiftKey || !ev.ctrlKey || !ev.altKey) return;
    if (ev.code !== 'KeyP') return;

    ev.preventDefault();

    visible = !visible;

    if (element) element.style.display = visible ? 'block' : 'none';

    if (visible) {
      systemMs.clear();
      ensureElement().style.display = 'block';
    }
  });

  let sinceRefresh = 0;

  scene.onAfterRenderObservable.add(() => {
    if (!visible) return;

    // The readout is for reading, not for animating: 5 Hz is plenty and keeps
    // the overlay's own cost (two scene walks) off the frame budget.
    sinceRefresh += scene.getEngine().getDeltaTime();
    if (sinceRefresh < 200) return;
    sinceRefresh = 0;

    render(scene);
  });
}
