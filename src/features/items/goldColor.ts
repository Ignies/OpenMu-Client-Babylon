/**
 * `getGoldColor` (ZzzInventory.cpp:1094-1110): every zen amount the UI paints
 * is coloured by how large it is. The original's literals are ABGR.
 */
export function goldColor(amount: number): string {
  if (amount >= 10_000_000) return '#ff0000';
  if (amount >= 1_000_000) return '#ff9600';
  if (amount >= 100_000) return '#00c918';
  return '#ffdc96';
}
