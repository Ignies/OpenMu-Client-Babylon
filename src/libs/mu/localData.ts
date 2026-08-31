/**
 * `Data/Local/<pack>/…` — the original client's own localisation.
 *
 * Webzen shipped one folder per language under `Data/Local/`, with the language
 * tag in every file name: `Eng/Quest_eng.bmd`, `Spn/Quest_spn.bmd`,
 * `Por/Quest_por.bmd`. That is where the quest names, the NPC dialogue scripts,
 * the warp list and the master-skill tooltips live — text the client does not
 * write itself and so is not in `i18n/recipes.ts`.
 *
 * This resolves one of those files for the active language and falls back to
 * English **per file**, so a pack that is only half there still gives its half.
 * The packs are not consistent about the case of the base name (`MoveReq_por`
 * but `movereq_spn`, `Text_spn` but `text_por`), so each candidate is tried in
 * the spelling asked for and all lower case; NTFS does not care, a static host
 * usually does.
 *
 * Which pack a language uses is `dataPack` on its `LanguageLayer`; a language
 * without one reads English here and is still fully translated everywhere
 * `t()` reaches.
 */

import { i18n } from '../../i18n';
import { downloadDataFile } from './dataFolder';

/** Empty means "not there" everywhere below — the readers all tolerate it. */
const MISSING = new Uint8Array(0);

/** One decoder per code page; `TextDecoder` construction is not free. */
const decoders = new Map<string, TextDecoder>();

/**
 * A NUL-terminated string out of one of these tables, in the code page the
 * active pack declares. English is ASCII, so it reads the same either way; the
 * Latin packs are windows-1252 and would come back as replacement characters
 * through a UTF-8 decoder ("Evid�ncia" instead of "Evidência").
 */
export function decodeLocalText(
  bytes: Uint8Array,
  offset: number,
  length: number
): string {
  let end = offset;
  const stop = Math.min(bytes.length, offset + length);
  while (end < stop && bytes[end] !== 0) end++;

  const label = i18n.dataEncoding;
  let decoder = decoders.get(label);
  if (!decoder) {
    // An unknown label throws; fall back rather than lose the whole table.
    try {
      decoder = new TextDecoder(label);
    } catch {
      decoder = new TextDecoder('utf-8');
    }
    decoders.set(label, decoder);
  }

  return decoder.decode(bytes.subarray(offset, end));
}

/**
 * The paths to try for one localised table, best first: the active pack, then
 * English, then any language-less sibling in `Local/` the caller names.
 *
 * @param base file name without the `_<lang>` tag or the extension
 *             (`Quest`, `MoveReq`, `MasterSkillTooltip`)
 * @param neutral optional language-less fallback (`Local/Quest.bmd`)
 */
export function localDataCandidates(base: string, neutral?: string): string[] {
  const paths: string[] = [];
  const pack = i18n.dataPack;

  const push = (folder: string, suffix: string) => {
    paths.push(`Local/${folder}/${base}_${suffix}.bmd`);
    const lower = base.toLowerCase();
    if (lower !== base) paths.push(`Local/${folder}/${lower}_${suffix}.bmd`);
  };

  if (pack) push(pack.folder, pack.suffix);
  push('Eng', 'eng');
  if (neutral) paths.push(neutral);

  return paths;
}

/** One optional file; empty when it is not on the server. */
async function optional(path: string): Promise<Uint8Array> {
  try {
    return await downloadDataFile(path);
  } catch {
    return MISSING;
  }
}

/**
 * Splits a line the way `packRepairs.ts` keys it: on whitespace and `;`, then
 * a token into leading punctuation / core / trailing punctuation. `?` counts
 * as part of the core, because in these files it is as often a lost accent as
 * a question mark.
 */
const TOKEN_SPLIT = /([\s;]+)/;
const LEADING = /^[^A-Za-zÀ-ÿ0-9?]+/;
const TRAILING = /[^A-Za-zÀ-ÿ0-9?]+$/;

/**
 * Put the accents back into a line from a damaged pack. A no-op for a pack
 * with no `repairs`, which is every pack but the two Latin ones.
 */
export function repairPackText(text: string): string {
  const repairs = i18n.dataRepairs;
  if (!repairs || !text) return text;

  // The ambiguous forms first: they need the words around them.
  let out = text;
  for (const [from, to] of repairs.phrases) out = out.split(from).join(to);

  return out
    .split(TOKEN_SPLIT)
    .map(part => {
      if (!part || !part.includes('?')) return part;

      const lead = LEADING.exec(part)?.[0] ?? '';
      const rest = part.slice(lead.length);
      const trail = TRAILING.exec(rest)?.[0] ?? '';
      const core = rest.slice(0, rest.length - trail.length);

      const fixed = repairs.tokens[core];
      return fixed === undefined ? part : lead + fixed + trail;
    })
    .join('');
}

/**
 * Dev-only sanity check on a table that has just been decoded.
 *
 * Some copies of the language packs in the wild were run through a lossy
 * conversion before they were shipped: a UTF-8 decoder read the code-page
 * bytes, and every accented character came back as `?` — taking the byte after
 * it with it ("héroe" → "h?oe", "próxima" → "pr?ima"). The text stays readable
 * but the accents are gone from the *file*, so no decoder can bring them back.
 * Say so once, loudly, rather than let it look like a bug here.
 *
 * A healthy Latin pack has far more accented characters than question marks;
 * a gutted one inverts that.
 */
export function checkPackText(base: string, samples: Iterable<string>): void {
  if (!import.meta.env?.DEV) return;

  const pack = i18n.dataPack;
  if (!pack || !/^windows-125[0-9]$/.test(pack.encoding ?? '')) return;

  let accents = 0;
  let questions = 0;

  for (const text of samples) {
    for (const ch of text) {
      const c = ch.codePointAt(0)!;
      if (c === 0x3f) questions++;
      else if (c > 0x7f) accents++;
    }
  }

  if (questions > accents * 2 && questions > 50) {
    console.warn(
      `[i18n] Local/${pack.folder}/${base}_${pack.suffix}.bmd lost its accents ` +
        `before it was shipped (${questions} "?" against ${accents} accented ` +
        `characters). The text is the pack's; replacing that one file with an ` +
        `undamaged copy fixes it — every other table is read per file.`
    );
  }
}

/**
 * The first of `localDataCandidates` that is actually there, or empty. Nothing
 * is cached: the tables that use this hold their own decoded copy and re-read
 * it when the language changes.
 */
export async function downloadLocalDataFile(
  base: string,
  neutral?: string
): Promise<Uint8Array> {
  for (const path of localDataCandidates(base, neutral)) {
    const bytes = await optional(path);
    if (bytes.length) return bytes;
  }

  console.warn(`Local table ${base} is missing in every language.`);
  return MISSING;
}
