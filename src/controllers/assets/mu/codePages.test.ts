import { describe, expect, it } from 'vitest';
import { textDecoderFor } from './codePages';
import { encoderFor } from '../../../../tools/localPacks';

describe('pack code pages', () => {
  it('reads the Devanagari page as the block laid over the high half', () => {
    const decode = (bytes: number[]) => textDecoderFor('x-mu-devanagari').decode(new Uint8Array(bytes));
    expect(decode([0x48, 0x69])).toBe('Hi');
    expect(decode([0x80 + 0x39]).codePointAt(0)).toBe(0x0939);
    expect(decode([0xff]).codePointAt(0)).toBe(0x097f);
  });

  it('puts the dandas and the joiners in the free Bengali slots', () => {
    const decode = (byte: number) => textDecoderFor('x-mu-bengali').decode(new Uint8Array([byte])).codePointAt(0);
    expect(decode(0x80 + 0x15)).toBe(0x0995);
    expect(decode(0xe4)).toBe(0x0964);
    expect(decode(0xe5)).toBe(0x0965);
    expect(decode(0x84)).toBe(0x200c);
    expect(decode(0x8d)).toBe(0x200d);
  });

  it('round trips through the pack tools, one byte a letter', () => {
    for (const label of ['x-mu-devanagari', 'x-mu-bengali']) {
      const encode = encoderFor(label);
      const decoder = textDecoderFor(label);
      const text = label === 'x-mu-devanagari' ? 'हिन्दी पाठ।' : 'বাংলা লেখা।';
      const bytes = encode(text);
      expect(bytes.length).toBe(text.length);
      expect(decoder.decode(bytes)).toBe(text);
    }
  });

  it('refuses a letter from another script rather than guessing', () => {
    expect(() => encoderFor('x-mu-devanagari')('বাংলা')).toThrow(/cannot hold/);
  });

  it('reads an unknown label as UTF-8', () => {
    expect(textDecoderFor('x-no-such-page').decode(new TextEncoder().encode('ok é'))).toBe('ok é');
  });
});
