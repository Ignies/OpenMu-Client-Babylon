import {
  Color3,
  type AbstractMesh,
  type Observer,
  type Scene,
} from '../babylon/exports';
import {
  hullOutlineActive,
  inkDarkness,
  lineWidth,
} from '../renderingStyle';

/**
 * The inverted hull outline on the figures: sole owner of `renderOutline`,
 * `outlineWidth` and `outlineColor`. The Outline mode option picks it.
 */

/**
 * Tiles of hull per notch of the line width slider (half a centimetre a
 * notch, so the slider spans 0.5 to 2.5 cm on a 180 cm body). Past that the
 * seams a split normal opens stop reading as a line and start reading as a
 * torn shell.
 */
const WIDTH_PER_STEP = 0.005;

/**
 * How far from black the faintest line sits. The hull is a flat colour
 * written into the linear buffer *before* the exposure and the tone curve,
 * so a grey that looks like a faint line as a number comes out of the curve
 * lighter than the armour it is drawn around: measured, 0.2 read as a white
 * rim rather than a soft one. The line strength therefore moves over a
 * narrow range near black, squared so the top of the slider is properly
 * black and the bottom is a dark grey. The width slider is the real control
 * here; the ink pass is the one whose strength spans a whole range, because
 * it multiplies the frame instead of replacing it.
 */
const FAINTEST = 0.15;

type Runtime = {
  scene: Scene;
  added: Observer<AbstractMesh>;
};

let runtime: Runtime | null = null;

/** What the meshes are wearing, so a sweep only runs when something moves. */
const shown = { active: false, width: 0, tone: -1 };

const colour = new Color3(0, 0, 0);

function outlined(mesh: AbstractMesh): boolean {
  return mesh.metadata?.characterAsset === true;
}

function dress(mesh: AbstractMesh): void {
  if (!outlined(mesh)) return;

  mesh.renderOutline = shown.active;
  mesh.outlineWidth = shown.width;
  mesh.outlineColor = colour;
}

function sweep(scene: Scene): void {
  for (const mesh of scene.meshes) dress(mesh);
}

function disposeHullOutline(): void {
  if (!runtime) return;

  runtime.scene.onNewMeshAddedObservable.remove(runtime.added);
  shown.active = false;
  sweep(runtime.scene);
  runtime = null;
}

/**
 * Once a tick from the director. Bodies spawn and despawn constantly, so a
 * new mesh is dressed as it arrives and the whole scene is swept only when
 * the option itself moves.
 */
export function syncHullOutline(scene: Scene): void {
  const active = hullOutlineActive();

  if (runtime && (!active || runtime.scene !== scene)) {
    disposeHullOutline();
  }

  if (!active) return;

  if (!runtime) {
    runtime = {
      scene,
      added: scene.onNewMeshAddedObservable.add(mesh => dress(mesh)),
    };
  }

  // An opaque hull cannot multiply the way the ink pass does, so the line
  // strength picks how far toward black the hull sits instead.
  const tone = inkDarkness();
  const width = lineWidth() * WIDTH_PER_STEP;

  if (shown.active && shown.width === width && shown.tone === tone) return;

  const lift = Math.max(0, 1 - tone);
  const grey = lift * lift * FAINTEST;

  shown.active = true;
  shown.width = width;
  shown.tone = tone;
  colour.set(grey, grey, grey);
  sweep(scene);
}
