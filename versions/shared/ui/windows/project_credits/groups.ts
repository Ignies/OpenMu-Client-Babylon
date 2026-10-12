import type { Credit } from '@/modules/credits';

export type CreditGroup = 'thanks' | 'contributors' | 'playtesters' | 'reporters' | 'everyone';

const groupOf = (c: Credit): CreditGroup =>
  c.kind === 'thanks'
    ? 'thanks'
    : c.kind === 'playtest'
      ? 'playtesters'
      : c.kind === 'everyone'
        ? 'everyone'
        : c.commits > 0
          ? 'contributors'
          : 'reporters';

const ORDER: readonly CreditGroup[] = ['thanks', 'contributors', 'playtesters', 'reporters', 'everyone'];

/** The credits' running order cut into the window's groups; an empty group is left out. */
export function creditGroups(list: readonly Credit[]): { group: CreditGroup; credits: Credit[] }[] {
  return ORDER.map(group => ({ group, credits: list.filter(c => groupOf(c) === group) })).filter(g => g.credits.length);
}
