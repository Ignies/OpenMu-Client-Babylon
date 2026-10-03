import type { AnimationDef } from './animation';

/** The first line of the generated PlayerAction block in versions/shared/objects/enum.ts. */
export const PLAYER_ACTION_ENUM_MARK =
  '// Generated from versions/shared/animations/<action>.ts by `bun versions/shared/animations/write_enum.ts`: do not edit.';

/** The PlayerAction enum the animation files describe, ids explicit, `MAX_PLAYER_ACTION` one past the last. */
export function playerActionEnumSource(defs: readonly AnimationDef[]): string {
  const sorted = [...defs].sort((a, b) => a.action - b.action);
  // An alias takes the number and the file's own name refers to it (`PLAYER_FLY_RIDE = PLAYER_ATTACK_END`):
  // the reverse lookup still gives the file's name, and no id is written twice.
  const lines = sorted.flatMap(d => {
    const [first, ...rest] = [...(d.aliases ?? []), d.name];
    return [`  ${first} = ${d.action},`, ...rest.map(n => `  ${n} = ${first},`)];
  });
  const max = sorted.length ? sorted[sorted.length - 1].action + 1 : 0;
  return `${PLAYER_ACTION_ENUM_MARK}\nexport enum PlayerAction {\n${lines.join('\n')}\n  MAX_PLAYER_ACTION = ${max},\n}\n`;
}

/** `text` (enum.ts) with its generated PlayerAction block replaced by `block`. */
export function replacePlayerActionEnum(text: string, block: string): string {
  const start = text.indexOf(PLAYER_ACTION_ENUM_MARK);
  if (start < 0) throw new Error('PlayerAction block mark not found');
  // The working copy may have CRLF line endings (core.autocrlf): match either and keep the file's own.
  const close = /\r?\n\}\r?\n/.exec(text.slice(start));
  if (!close) throw new Error('PlayerAction block end not found');
  const eol = close[0].startsWith('\r') ? '\r\n' : '\n';
  return text.slice(0, start) + block.replace(/\n/g, eol) + text.slice(start + close.index + close[0].length);
}
