// Pack code pages: WHATWG labels plus the x-mu one byte pages. See assets/readme.md.

export type TextDecoderLike = { decode(bytes: Uint8Array): string };

type BlockPage = { base: number; extra: Readonly<Record<number, number>> };

const BLOCK_PAGES: Readonly<Record<string, BlockPage>> = {
  'x-mu-devanagari': { base: 0x0900, extra: {} },
  'x-mu-bengali': {
    base: 0x0980,
    extra: { 0xe4: 0x0964, 0xe5: 0x0965, 0x84: 0x200c, 0x8d: 0x200d },
  },
};

class BlockDecoder implements TextDecoderLike {
  private readonly chars: string[] = [];

  constructor({ base, extra }: BlockPage) {
    for (let byte = 0; byte < 0x100; byte++) {
      this.chars.push(
        byte < 0x80
          ? String.fromCharCode(byte)
          : String.fromCodePoint(extra[byte] ?? base + byte - 0x80)
      );
    }
  }

  decode(bytes: Uint8Array): string {
    let text = '';
    for (const byte of bytes) text += this.chars[byte];
    return text;
  }
}

const decoders = new Map<string, TextDecoderLike>();

export function textDecoderFor(label: string): TextDecoderLike {
  let decoder = decoders.get(label);
  if (decoder) return decoder;

  const page = BLOCK_PAGES[label];
  if (page) {
    decoder = new BlockDecoder(page);
  } else {
    try {
      decoder = new TextDecoder(label);
    } catch {
      decoder = new TextDecoder('utf-8');
    }
  }

  decoders.set(label, decoder);
  return decoder;
}
