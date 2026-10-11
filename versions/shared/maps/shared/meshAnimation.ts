/**
 * Building blocks for a map's `render.meshAnimations` rows (`MoveObject`'s
 * `o->BlendMeshTexCoordU/V` and `o->BlendMeshLight` writes), as functions of milliseconds.
 */

/** `-(WorldTime % period * rate)`: a scroll that runs down and wraps. */
export const saw = (period: number, rate: number) => (t: number) =>
  -((t % period) * rate);

/** `WorldTime % period * rate`: the same scroll running up. */
export const sawUp = (period: number, rate: number) => (t: number) =>
  (t % period) * rate;

/**
 * A per-25-Hz-tick increment (`o->BlendMeshTexCoordV += k` each `MoveObject`,
 * the Season 3+ idiom) as a function of milliseconds: `k` per 40 ms, wrapped
 * to the texture.
 */
export const perTick = (k: number) => (t: number) => ((t * k) / 40) % 1;

/** `(float)(rand() % n + from) * 0.1f`: a fresh light in tenths every frame. */
export const rollTenths = (n: number, from: number) => () => (Math.floor(Math.random() * n) + from) * 0.1;
