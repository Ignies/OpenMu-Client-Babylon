/**
 * How a zen drop is drawn: `RenderZen` (ZzzObject.cpp:6327) puts the Gold
 * model down once per coin in a flat scatter around the drop, the count taken
 * from the amount, and `RenderItems` (:6454) then draws the drop itself at the
 * centre on top - so a pile holds one coin more than `zenCoinCount` says.
 *
 * Pure geometry, no Babylon: the drop's own model turns this into thin
 * instances (`common/dropObject.ts`).
 */

/** `MaxRenderedZenCoins`, and the floor of RenderZen's clamp. */
const MAX_COINS = 12;
const MIN_COINS = 3;

/** `const auto maxRadius = coinCount + 20`, in the original's centimetres. */
const RADIUS_MARGIN_CM = 20;

/**
 * How much wider than the original the pile is laid out. `RenderZen` scatters
 * inside `coinCount + 20` cm - a third of a tile - against a coin model 14.8 cm
 * across, so twelve coins overlap into one mound and, at this camera, a fortune
 * and a handful read the same. The coin count stays the original's; only the
 * ground it covers grows.
 */
const SPREAD = 1.5;

/** `RandomTable`: 100 values in 0..359, drawn once a run (Winmain.cpp:2159). */
const TABLE_SIZE = 100;
const TABLE_MAX = 360;

const DEG = Math.PI / 180;

let randomTable: Int32Array | null = null;

function table(): Int32Array {
  if (randomTable) return randomTable;

  const built = new Int32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) built[i] = Math.floor(Math.random() * TABLE_MAX);
  randomTable = built;
  return built;
}

/** Test seam: pin the table, or (null) let the next pile draw a fresh one. */
export function setZenRandomTable(values: ArrayLike<number> | null): void {
  randomTable = values ? Int32Array.from(values) : null;
}

/**
 * `static_cast<int>(sqrtf(Level)) / 2` clamped to 3..12, with `Level` the
 * dropped amount (`CreateMoneyDrop` puts it there): the pile stops growing at
 * 576 zen, and anything below 36 still shows the floor of three.
 */
export function zenCoinCount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return MIN_COINS;

  const coins = Math.floor(Math.floor(Math.sqrt(amount)) / 2);

  return Math.min(Math.max(coins, MIN_COINS), MAX_COINS);
}

/** How far from the drop the outermost coin of a pile of `count` may lie, cm. */
export function zenPileRadius(count: number): number {
  return (count + RADIUS_MARGIN_CM) * SPREAD;
}

/** One coin's place in the pile, centimetres on the ground plane. */
export type ZenCoinOffset = { readonly x: number; readonly y: number };

/**
 * Where the coins of one pile lie. `seed` is the drop's own id, standing in
 * for the original's slot in `Items[]`: the angle comes from
 * `RandomTable[(k * 20 + i) % 100]` and the radius from
 * `RandomTable[(k + i) % 100]`, as in `RenderZen`.
 *
 * The one departure is the radius curve. The original uses the table value
 * straight, which is uniform in the radius and so crowds the middle of the
 * disc - half the coins land in the inner third of it, on top of each other.
 * Taking its square root spreads them evenly over the area instead, which is
 * what makes a pile look like coins rather than one lump.
 */
export function zenCoinScatter(seed: number, count: number): ZenCoinOffset[] {
  const values = table();
  const k = Math.abs(Math.trunc(seed)) % TABLE_SIZE;
  const maxRadius = zenPileRadius(count);

  const out: ZenCoinOffset[] = [];

  for (let i = 0; i < count; i++) {
    const angle = values[(k * 20 + i) % TABLE_SIZE] * DEG;
    const radius = maxRadius * Math.sqrt(values[(k + i) % TABLE_SIZE] / TABLE_MAX);

    out.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }

  return out;
}
