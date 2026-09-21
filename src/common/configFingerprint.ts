import { GameOptions } from './gameOptions';
import { i18n } from '../i18n';
import { texturePacks } from './texturePacks';

/**
 * Every setting a player has, as a short hex string.
 *
 * A screenshot of the performance overlay is the only thing most reports
 * come with, and "it runs badly" means nothing without knowing what was
 * switched on: quality, render distance, the texture pack, whether the
 * post chain was even running. Printing eighty rows is not an option, so
 * the whole configuration goes out as hex and `configuration_hex.md` says
 * how to read it back.
 *
 * The field order is taken from `GameOptions` itself, sorted, so it can
 * never drift from the options that exist - and `configFingerprint.test.ts`
 * fails if the table in the document stops matching, because a decoder
 * table that quietly goes stale is worse than none at all.
 */

/** Bumped whenever the layout below changes shape. */
export const CONFIG_FINGERPRINT_VERSION = 1;

type OptionValue = boolean | number | string;

function options(): Record<string, OptionValue> {
  return GameOptions as unknown as Record<string, OptionValue>;
}

/** The boolean options, in the order their bits are packed. */
export function flagFields(): string[] {
  const all = options();

  return Object.keys(all)
    .filter(k => typeof all[k] === 'boolean')
    .sort();
}

/** The numeric options, in the order their bytes are written. */
export function numberFields(): string[] {
  const all = options();

  return Object.keys(all)
    .filter(k => typeof all[k] === 'number')
    .sort();
}

/**
 * Numbers are stored with a bias so the ones that go negative (brightness
 * trims by tenths of a stop either way) survive a single byte. Nothing in
 * the options comes near the ends of the range.
 */
export const NUMBER_BIAS = 128;

function byte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n) + NUMBER_BIAS));
}

/** A short, stable digest of a string, so a pack name fits in two bytes. */
export function shortHash(text: string): number {
  let h = 0x811c;

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x0193) & 0xffff;
  }

  return h & 0xffff;
}

function hex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The layout, in order:
 *
 *   1 byte   format version
 *   1 byte   how many flag bytes follow
 *   n bytes  the boolean options, one bit each, first field in bit 0
 *   1 byte   how many number bytes follow
 *   m bytes  the numeric options, one byte each, biased by 128
 *   2 bytes  the language code, two ASCII letters
 *   2 bytes  a digest of the texture pack id, 0000 when none is chosen
 */
export function configFingerprintBytes(): number[] {
  const all = options();
  const flags = flagFields();
  const numbers = numberFields();

  const flagBytes: number[] = new Array(Math.ceil(flags.length / 8)).fill(0);

  flags.forEach((key, i) => {
    if (all[key] === true) flagBytes[i >> 3] |= 1 << (i & 7);
  });

  const language = (i18n.language || '??').slice(0, 2).padEnd(2, '?');
  const pack = texturePacks.activeId ? shortHash(texturePacks.activeId) : 0;

  return [
    CONFIG_FINGERPRINT_VERSION,
    flagBytes.length,
    ...flagBytes,
    numbers.length,
    ...numbers.map(key => byte(Number(all[key]))),
    language.charCodeAt(0),
    language.charCodeAt(1),
    (pack >> 8) & 0xff,
    pack & 0xff,
  ];
}

export function configFingerprint(): string {
  return hex(configFingerprintBytes());
}

/** The same string, split so it can be read off a screenshot. */
export function configFingerprintLines(perLine = 48): string[] {
  const s = configFingerprint();
  const out: string[] = [];

  for (let i = 0; i < s.length; i += perLine) out.push(s.slice(i, i + perLine));

  return out;
}
