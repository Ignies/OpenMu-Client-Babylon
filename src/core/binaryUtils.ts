/**
 * Byte-level helpers with no Babylon (and no DOM) dependency.
 *
 * These used to live in `common/utils.ts`, which imports `Scene`/`Texture`.
 * Two things need them without wanting the engine:
 *
 *  - the terrain worker (todo C8), which reaches them via
 *    `mapFileEncryption`;
 *  - the generated packet modules (todo C9), which are the bulk of the app
 *    chunk. While they imported `common/utils`, any attempt to split them
 *    into their own chunk dragged 2.4 MB of Babylon along with them.
 *
 * `common/utils.ts` re-exports every name here, so existing importers are
 * unaffected.
 */

export function castToByte(n: number): Byte {
  return n & 0xff;
}

export function ArrayCopy<TArray extends Uint8Array | Uint16Array>(
  buffer: TArray,
  srcOffset: Int,
  dst: TArray,
  dstOffset: Int,
  count: Int
): void {
  for (let i = 0; i < count; i++) {
    dst[dstOffset + i] = buffer[srcOffset + i];
  }
}

export function GetByteValue(byte: Byte, bits: Int, leftShifted: Int): Byte {
  const andMask = castToByte(Math.pow(2, bits) - 1);
  const numericalValue = castToByte((byte >> leftShifted) & andMask);

  return numericalValue;
}

export function SetByteValue(
  oldValue: Byte,
  value: Byte,
  bits: Int,
  leftShifted: Int
): Byte {
  const bitMask = castToByte(Math.pow(2, bits) - 1) << leftShifted;
  const clearMask = castToByte(0xff - bitMask);

  oldValue &= clearMask;

  const numericalValue = castToByte(value); //Convert.ToByte check?
  oldValue |= castToByte((numericalValue << leftShifted) & bitMask);

  return oldValue;
}

export function GetBoolean(byte: Byte, leftShifted: Int): boolean {
  return ((byte >> leftShifted) & 1) === 1;
}

export function SetBoolean(
  oldValue: Byte,
  value: Boolean,
  leftShifted: Int
): Byte {
  const mask = castToByte(1 << leftShifted);
  const clearMask = castToByte(0xff - (1 << leftShifted));
  oldValue &= clearMask;
  if (value) {
    oldValue |= mask;
  }

  return oldValue;
}
