import { signalFor } from './signals';

/**
 * Turning OpenMU's log into rows.
 *
 * OpenMU logs through Serilog. The stock deployment writes rolling **text**
 * files, which a person can read and nothing can query - so the deployment
 * gains one more sink writing Serilog's compact JSON, one event per line, and
 * this reads that. It is a configuration change on the server host
 * (`appsettings.json`), not a fork: see `documentation/ops_console/ARCHITECTURE.md`.
 *
 * Nothing here trusts the log's *text*. Classification is by `@mt`, the
 * message template, which is a literal in OpenMU's source - so a player named
 * "Probably Hacker" cannot write themselves into this table by saying their
 * own name.
 */

/** One line of Serilog's compact JSON. */
type CompactEvent = {
  /** Timestamp, ISO 8601. */
  '@t'?: unknown;
  /** Message template. */
  '@mt'?: unknown;
  /** Level; absent means Information. */
  '@l'?: unknown;
  [property: string]: unknown;
};

export type CheatEvent = {
  at: number;
  signal: string;
  severity: string;
  account: string | null;
  character: string | null;
  message: string;
  template: string;
  properties: string;
};

/** Serilog property placeholders: `{Name}`, `{0}`, `{@Thing}`, `{Name,-10:000}`. */
const PLACEHOLDER = /\{([@$]?)([A-Za-z0-9_]+)(?:,-?\d+)?(?::[^}]*)?\}/g;

/**
 * The template with its values filled in, so a reader gets a sentence.
 * `{{` and `}}` are Serilog's escapes for literal braces.
 */
export function render(template: string, properties: Record<string, unknown>): string {
  return template
    .replace(PLACEHOLDER, (whole, _sigil: string, name: string) => {
      const value = properties[name];
      if (value === undefined || value === null) return whole;
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    })
    .replace(/\{\{/g, '{')
    .replace(/\}\}/g, '}');
}

/**
 * The player names in `{Player}` are the whole player object, which OpenMU
 * renders as `character (account)` or just the account before a character is
 * selected. Pulled apart so the table can be asked about either.
 */
function splitPlayer(rendered: string): { character: string | null; account: string | null } {
  const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(rendered.trim());
  if (!match) return { character: rendered.trim() || null, account: null };
  return { character: match[1] || null, account: match[2] || null };
}

/** Read one JSON line into a row, or nothing when it is not a cheat warning. */
export function parseLine(line: string): CheatEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let event: CompactEvent;
  try {
    event = JSON.parse(trimmed) as CompactEvent;
  } catch {
    // A half-written last line while the server is mid-flush. The offset is
    // only advanced past complete lines, so it will be read again whole.
    return null;
  }

  const template = typeof event['@mt'] === 'string' ? event['@mt'] : null;
  if (!template) return null;

  const signal = signalFor(template);
  if (!signal) return null;

  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (!key.startsWith('@')) properties[key] = value;
  }

  const at = typeof event['@t'] === 'string' ? Date.parse(event['@t']) : Number.NaN;

  let account = signal.account ? stringOf(properties[signal.account]) : null;
  let character = signal.character ? stringOf(properties[signal.character]) : null;

  // `{Player}` is the player object, not a name.
  if (character && !account && /\(.*\)/.test(character)) {
    const split = splitPlayer(character);
    character = split.character;
    account = split.account;
  }

  return {
    at: Number.isFinite(at) ? at : Date.now(),
    signal: signal.id,
    severity: signal.severity,
    account,
    character,
    message: render(template, properties),
    template,
    properties: JSON.stringify(properties),
  };
}

function stringOf(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

/** Every cheat warning in a chunk of log, and how many bytes were consumed. */
export function parseChunk(text: string): { events: CheatEvent[]; consumed: number } {
  const events: CheatEvent[] = [];
  let consumed = 0;

  // Only whole lines: a trailing partial line is left for the next read, so a
  // record split across two reads is never dropped or counted twice.
  let start = 0;
  for (;;) {
    const end = text.indexOf('\n', start);
    if (end < 0) break;

    const event = parseLine(text.slice(start, end));
    if (event) events.push(event);

    start = end + 1;
    consumed = Buffer.byteLength(text.slice(0, start), 'utf8');
  }

  return { events, consumed };
}
