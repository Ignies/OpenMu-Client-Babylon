import type { AnimationDef } from './animation';

/** The first line of the generated PlayerAction block in versions/shared/objects/enum.ts. */
export const PLAYER_ACTION_ENUM_MARK =
  '// Generated from versions/shared/animations/<action>.ts by `bun versions/shared/animations/write_enum.ts`: do not edit.';

/** The PlayerAction enum the animation files describe, ids explicit, `MAX_PLAYER_ACTION` one past the last. */
export function playerActionEnumSource(defs: readonly AnimationDef[]): string {
  const sorted = [...defs].sort((a, b) => a.action - b.action);
  const lines = sorted.flatMap(d => [...(d.aliases ?? []), d.name].map(n => `  ${n} = ${d.action},`));
  const max = sorted.length ? sorted[sorted.length - 1].action + 1 : 0;
  return `${PLAYER_ACTION_ENUM_MARK}\nexport enum PlayerAction {\n${lines.join('\n')}\n  MAX_PLAYER_ACTION = ${max},\n}\n`;
}

/** `text` (enum.ts) with its generated PlayerAction block replaced by `block`. */
export function replacePlayerActionEnum(text: string, block: string): string {
  const start = text.indexOf(PLAYER_ACTION_ENUM_MARK);
  if (start < 0) throw new Error('PlayerAction block mark not found');
  const end = text.indexOf('\n}\n', start);
  return text.slice(0, start) + block + text.slice(end + 3);
}
