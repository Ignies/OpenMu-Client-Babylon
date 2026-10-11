/**
 * Recognises OpenMU's English `ServerMessage` sentences
 * (`GameLogic/Properties/PlayerMessage.resx`) and translates them. See i18n/readme.md.
 */

import { ENGLISH, onTextRegistered } from './registry';
import { t, type TextKey } from './index';

export const SERVER_MESSAGE_PREFIX = 'serverMessage.';

type Pattern = {
  readonly key: TextKey;
  readonly re: RegExp;
  /** Which `{n}` each capture group fills, in capture order. */
  readonly holes: readonly string[];
};

const exact = new Map<string, TextKey>();

// In registration order (the chat module's `i18n/en.ts` order), which is how
// ties break: `Reset #{0}: ... {3} x {4}; grants ...` has to be tried before
// the variant without the item, whose pattern also fits it.
const patterns: Pattern[] = [];

// Built on first use and again after new text registers.
let stale = true;
onTextRegistered(() => {
  stale = true;
});

function escape(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function build(): void {
  stale = false;
  exact.clear();
  patterns.length = 0;

  for (const key of Object.keys(ENGLISH) as TextKey[]) {
    if (!key.startsWith(SERVER_MESSAGE_PREFIX)) continue;

    const source = ENGLISH[key];
    const holes = [...source.matchAll(/\{(\d+)\}/g)].map(m => m[1]);

    if (!holes.length) {
      exact.set(source, key);
      continue;
    }

    const literals = source.split(/\{\d+\}/).map(escape);
    patterns.push({ key, re: new RegExp(`^${literals.join('(.+?)')}$`), holes });
  }
}

type ServerTextMatch = {
  readonly key: TextKey;
  readonly params: Record<string, string>;
};

/** The catalogue entry a server line is, or null when it is free text. */
export function matchServerText(text: string): ServerTextMatch | null {
  if (stale) build();

  const hit = exact.get(text);
  if (hit) return { key: hit, params: {} };

  for (const pattern of patterns) {
    const match = pattern.re.exec(text);
    if (!match) continue;

    const params: Record<string, string> = {};
    pattern.holes.forEach((hole, at) => {
      params[hole] = match[at + 1];
    });

    return { key: pattern.key, params };
  }

  return null;
}

/**
 * The line to show for one the server sent. Unknown text comes back as it went
 * in.
 */
export function translateServerText(text: string): string {
  const found = matchServerText(text);
  if (found) return t(found.key, found.params);

  if (import.meta.env?.DEV) {
    console.info('[i18n] server text not catalogued:', text);
  }

  return text;
}
