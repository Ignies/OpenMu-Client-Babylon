/**
 * THE SERVER'S OWN SENTENCES.
 *
 * OpenMU writes its player messages as finished English
 * (`GameLogic/Properties/PlayerMessage.resx`) and sends them as a
 * `ServerMessage` packet, so they arrive already worded and know nothing about
 * the language the player picked. The server can localize them itself -
 * `/language` switches `player.Culture` - but only into the cultures it was
 * built with, and it ships English alone.
 *
 * So the recognising happens here. Every sentence the server can send is a
 * `serverMessage.*` line in `recipes.ts`, worded exactly as OpenMU words it,
 * which lets the English catalogue double as the pattern that matches the
 * incoming text: one place to fix when a server upgrade rewords a message.
 *
 * A line that matches nothing is returned untouched. GM broadcasts, guild
 * notices, a message a newer server grew - free text stays free text rather
 * than turning into a blank or a key.
 */

import { EN_TEXT, type TextKey } from './recipes';
import { t } from './index';

export const SERVER_MESSAGE_PREFIX = 'serverMessage.';

type Pattern = {
  readonly key: TextKey;
  readonly re: RegExp;
  /** Which `{n}` each capture group fills, in capture order. */
  readonly holes: readonly string[];
};

const exact = new Map<string, TextKey>();

// In `recipes.ts` order, which is how ties break: `Reset #{0}: ... {3} x {4};
// grants ...` has to be tried before the variant without the item, whose
// pattern also fits it.
const patterns: Pattern[] = [];

function escape(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const key of Object.keys(EN_TEXT) as TextKey[]) {
  if (!key.startsWith(SERVER_MESSAGE_PREFIX)) continue;

  const source = EN_TEXT[key];
  const holes = [...source.matchAll(/\{(\d+)\}/g)].map(m => m[1]);

  if (!holes.length) {
    exact.set(source, key);
    continue;
  }

  const literals = source.split(/\{\d+\}/).map(escape);
  patterns.push({ key, re: new RegExp(`^${literals.join('(.+?)')}$`), holes });
}

export type ServerTextMatch = {
  readonly key: TextKey;
  readonly params: Record<string, string>;
};

/** The catalogue entry a server line is, or null when it is free text. */
export function matchServerText(text: string): ServerTextMatch | null {
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
