
const TGA_HEADER_SIZE = 18;
const TGA_UNCOMPRESSED_TRUE_COLOR = 2;
const TGA_TOP_LEFT_ORIGIN = 0x20;

export type DecodedTGA = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

export function decodeTGA(name: string, tga: Uint8Array): DecodedTGA {
  if (tga.length < TGA_HEADER_SIZE) {
    throw new Error(`${name} is too small to be a TGA`);
  }

  const view = new DataView(tga.buffer, tga.byteOffset, tga.byteLength);

  const idLength = tga[0];
  const colorMapType = tga[1];
  const imageType = tga[2];
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const pixelDepth = tga[16];
  const descriptor = tga[17];

  if (imageType !== TGA_UNCOMPRESSED_TRUE_COLOR || colorMapType !== 0) {
    throw new Error(
      `${name} is an unsupported TGA (type ${imageType}, colour map ${colorMapType})`
    );
  }

  if (pixelDepth !== 32 && pixelDepth !== 24) {
    throw new Error(`${name} has an unsupported depth of ${pixelDepth}bpp`);
  }

  const bytesPerPixel = pixelDepth / 8;
  const start = TGA_HEADER_SIZE + idLength;
  const expected = width * height * bytesPerPixel;

  if (tga.length - start < expected) {
    throw new Error(
      `${name} is truncated: expected ${expected} bytes of pixels, got ${
        tga.length - start
      }`
    );
  }

  const topDown = (descriptor & TGA_TOP_LEFT_ORIGIN) !== 0;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const srcRow = topDown ? y : height - 1 - y;
    let src = start + srcRow * width * bytesPerPixel;
    let dst = y * width * 4;

    for (let x = 0; x < width; x++) {
      pixels[dst] = tga[src + 2];
      pixels[dst + 1] = tga[src + 1];
      pixels[dst + 2] = tga[src];
      pixels[dst + 3] = bytesPerPixel === 4 ? tga[src + 3] : 255;

      src += bytesPerPixel;
      dst += 4;
    }
  }

  return { width, height, pixels };
}
