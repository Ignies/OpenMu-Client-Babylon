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

/** `RandomTable`: 100 values in 0..359, drawn once a run (Winmain.cpp:2159). */
const TABLE_SIZE = 100;

const DEG = Math.PI / 180;

let randomTable: Int32Array | null = null;

function table(): Int32Array {
  if (randomTable) return randomTable;

  const built = new Int32Array(TABLE_SIZE);
  for (let i = 0; i < TABLE_SIZE; i++) built[i] = Math.floor(Math.random() * 360);
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

/** One coin's place in the pile, centimetres on the ground plane. */
export type ZenCoinOffset = { readonly x: number; readonly y: number };

/**
 * Where the coins of one pile lie. `seed` is the drop's own id, standing in
 * for the original's slot in `Items[]`: the angle comes from
 * `RandomTable[(k * 20 + i) % 100]` and the radius from
 * `RandomTable[(k + i) % 100] % (coinCount + 20)`.
 */
export function zenCoinScatter(seed: number, count: number): ZenCoinOffset[] {
  const values = table();
  const k = Math.abs(Math.trunc(seed)) % TABLE_SIZE;
  const maxRadius = count + RADIUS_MARGIN_CM;

  const out: ZenCoinOffset[] = [];

  for (let i = 0; i < count; i++) {
    const angle = values[(k * 20 + i) % TABLE_SIZE] * DEG;
    const radius = values[(k + i) % TABLE_SIZE] % maxRadius;

    out.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }

  return out;
}
