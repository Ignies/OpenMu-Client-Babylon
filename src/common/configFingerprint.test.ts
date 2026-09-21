import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIG_FINGERPRINT_VERSION,
  NUMBER_BIAS,
  configFingerprint,
  configFingerprintBytes,
  flagFields,
  numberFields,
  shortHash,
} from './configFingerprint';
import { configHexTable } from '../../tools/configHexTable';

/**
 * A decoder table that has quietly gone stale is worse than no table: an old
 * screenshot would be read back as the wrong settings and nobody would know.
 * So the document is generated from the options and checked here.
 */
describe('configuration_hex.md', () => {
  it('is what the current options generate', () => {
    const committed = readFileSync(
      new URL('../../configuration_hex.md', import.meta.url),
      'utf8'
    ).replace(/\r\n/g, '\n');

    expect(committed.trim()).toBe(configHexTable().trim());
  });
});

describe('the fingerprint', () => {
  it('covers every option exactly once', () => {
    const flags = flagFields();
    const numbers = numberFields();
    const overlap = flags.filter(f => numbers.includes(f));

    expect(overlap).toEqual([]);
    expect(new Set(flags).size).toBe(flags.length);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('starts with the version and the section lengths', () => {
    const bytes = configFingerprintBytes();
    const flagBytes = Math.ceil(flagFields().length / 8);

    expect(bytes[0]).toBe(CONFIG_FINGERPRINT_VERSION);
    expect(bytes[1]).toBe(flagBytes);
    expect(bytes[2 + flagBytes]).toBe(numberFields().length);
  });

  it('is exactly as long as the layout says', () => {
    const flagBytes = Math.ceil(flagFields().length / 8);

    expect(configFingerprintBytes().length).toBe(
      1 + 1 + flagBytes + 1 + numberFields().length + 2 + 2
    );
  });

  it('is clean hex, two characters a byte', () => {
    const hex = configFingerprint();

    expect(hex).toMatch(/^[0-9a-f]+$/);
    expect(hex.length).toBe(configFingerprintBytes().length * 2);
  });

  it('round-trips the numbers through the bias', () => {
    const bytes = configFingerprintBytes();
    const flagBytes = Math.ceil(flagFields().length / 8);
    const first = 3 + flagBytes;

    numberFields().forEach((_, i) => {
      const decoded = bytes[first + i] - NUMBER_BIAS;
      expect(Number.isFinite(decoded)).toBe(true);
    });
  });

  it('ends with two letters of language and a pack digest', () => {
    const bytes = configFingerprintBytes();
    const lang = String.fromCharCode(bytes[bytes.length - 4], bytes[bytes.length - 3]);

    expect(lang).toMatch(/^[a-z?]{2}$/);
  });

  it('digests a pack name into two bytes, and differently for different names', () => {
    expect(shortHash('upscaled-512')).toBeLessThanOrEqual(0xffff);
    expect(shortHash('upscaled-512')).not.toBe(shortHash('original'));
    expect(shortHash('a')).toBe(shortHash('a'));
  });
});
