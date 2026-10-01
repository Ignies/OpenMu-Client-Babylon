import { useSyncExternalStore } from 'react';

/**
 * The original lays every widget out in a 640×480 space and stretches it to
 * the window (`ConvertX` / `ConvertY`, `g_fScreenRate_x/y`). Full-screen
 * sheets such as the minimap keep that space here and scale it uniformly by
 * the smaller window ratio, so the art stays square on wide screens.
 *
 * One observer watches the canvas (the same rect
 * `calculateScreenPositionSystem` projects into, so the UI and the world
 * agree to the pixel even with a scrollbar) and every reader subscribes to
 * it, instead of a `resize` listener per hook call.
 */

export const UI_STAGE_WIDTH = 640;
export const UI_STAGE_HEIGHT = 480;

export type UiViewport = { width: number; height: number; scale: number };

type Listener = () => void;

const listeners = new Set<Listener>();
let viewport: UiViewport = measure();
let watching = false;

function stageElement(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.querySelector('canvas');
}

function measure(): UiViewport {
  const el = stageElement();
  const width = el?.clientWidth || (typeof window === 'undefined' ? UI_STAGE_WIDTH : window.innerWidth);
  const height = el?.clientHeight || (typeof window === 'undefined' ? UI_STAGE_HEIGHT : window.innerHeight);
  return {
    width,
    height,
    scale: Math.min(width / UI_STAGE_WIDTH, height / UI_STAGE_HEIGHT),
  };
}

function refresh(): void {
  const next = measure();
  if (
    next.width === viewport.width &&
    next.height === viewport.height &&
    next.scale === viewport.scale
  ) {
    return;
  }
  viewport = next;
  for (const listener of listeners) listener();
}

function watch(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  window.addEventListener('resize', refresh);
  const el = stageElement();
  if (el && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(refresh).observe(el);
  }
}

/** The stage's size and the 640×480 → screen ratio, as of the last resize. */
export function getUiViewport(): UiViewport {
  watch();
  return viewport;
}

export function getUiStageScale(): number {
  return getUiViewport().scale;
}

/** Called after every change of the stage's size; returns the unsubscribe. */
export function onUiViewportChanged(listener: Listener): () => void {
  watch();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUiViewport(): UiViewport {
  return useSyncExternalStore(onUiViewportChanged, getUiViewport, getUiViewport);
}

export function useUiStageScale(): number {
  return useUiViewport().scale;
}
