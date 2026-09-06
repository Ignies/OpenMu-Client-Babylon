/**
 * First-person mouse look: the pointer lock, and the raw mouse deltas it
 * hands back to the facade.
 *
 * The lock is what makes the look unbounded - without it the cursor walks
 * into the window edge a quarter turn in. It costs the game its cursor
 * position: while the lock is held the browser freezes `clientX/clientY` at
 * wherever the pointer was when it was taken, and only `movementX/Y` are
 * live. So every pick in the game has to aim at the middle of the canvas
 * instead, which is what `aimX`/`aimY` do - the systems that pick (pointer
 * input, cursor, the walk click) run their coordinates through them, and the
 * on-screen cursor parks itself there, crosshair-style.
 *
 * `index.ts` stays the single writer of the camera angles: this module only
 * reports how far the mouse moved.
 */

import { EventBus } from '../libs/eventBus';

let canvasElement: HTMLCanvasElement | null = null;

let locked = false;

/** Whether the mouse is looking right now (the pointer lock is held). */
export function isMouseLookActive(): boolean {
  return locked;
}

/**
 * Where a pick aims: the crosshair while the look is locked, the pointer's
 * own position otherwise. Canvas-relative, the space `scene.pick` reads.
 */
export function aimX(clientX: number): number {
  return locked && canvasElement ? canvasElement.clientWidth / 2 : clientX;
}

export function aimY(clientY: number): number {
  return locked && canvasElement ? canvasElement.clientHeight / 2 : clientY;
}

function setLocked(value: boolean): void {
  if (locked === value) return;

  locked = value;
  EventBus.emit('mouseLookChanged', value);
}

/**
 * Take the lock on the next canvas click while `canLook` holds, and feed
 * `onLook` the mouse deltas for as long as it is held. Escape gives it back
 * (the browser's own way out); `releaseMouseLook` is the game's.
 */
export function installMouseLook(
  canvas: HTMLCanvasElement | null,
  canLook: () => boolean,
  onLook: (dx: number, dy: number) => void
): void {
  if (!canvas) return;

  canvasElement = canvas;

  // A lock needs a user gesture, so the click that asks for it is the same
  // one that swings - which is what a first-person game does anyway.
  canvas.addEventListener('pointerdown', () => {
    if (locked || !canLook()) return;

    // Chrome rate-limits a re-lock for about a second after Escape released
    // one, and rejects the promise; nothing to do but wait for the next
    // click.
    const request = canvas.requestPointerLock() as unknown as
      Promise<void> | undefined;

    request?.catch(() => {});
  });

  document.addEventListener('pointerlockchange', () => {
    setLocked(document.pointerLockElement === canvas);
  });

  document.addEventListener('pointerlockerror', () => setLocked(false));

  document.addEventListener('mousemove', ev => {
    if (!locked) return;

    onLook(ev.movementX, ev.movementY);
  });
}

/** Give the lock back: zoomed out of first person, or left the world. */
export function releaseMouseLook(): void {
  if (locked) document.exitPointerLock();
}
