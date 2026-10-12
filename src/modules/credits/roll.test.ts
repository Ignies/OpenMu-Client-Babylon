import { describe, expect, it, vi } from 'vitest';
import type { Credit } from './contributors';

const LIST: Credit[] = [
  { kind: 'thanks', name: 'Sven-n', commits: 0, reports: 0 },
  { kind: 'person', name: 'Ignies', commits: 900, reports: 0 },
  { kind: 'person', name: 'Helper', commits: 3, reports: 1 },
  { kind: 'playtest', name: 'REGZPL', commits: 0, reports: 0 },
  { kind: 'person', name: 'tester', commits: 0, reports: 2 },
];

vi.mock('./contributors', () => ({ loadCredits: async () => LIST }));
const { CreditsRoll, creditedNames } = await import('./roll');

describe('creditedNames', () => {
  it('credits the contributors with commits, by name, in any case', () => {
    expect([...creditedNames(LIST, {})].sort()).toEqual(['helper', 'ignies']);
  });

  it('matches a contributor in the character list by those characters only', () => {
    expect([...creditedNames(LIST, { ignies: ['RaiN', 'Kaze'] })].sort()).toEqual(['helper', 'kaze', 'rain']);
  });
});

describe('CreditsRoll', () => {
  it('reads the shared credits once, then answers by character name', async () => {
    expect(CreditsRoll.isCredited('Ignies')).toBe(false);
    const was = CreditsRoll.version;
    CreditsRoll.request();
    CreditsRoll.request();
    await vi.waitFor(() => expect(CreditsRoll.version).toBe(was + 1));
    expect(CreditsRoll.isCredited('IGNIES')).toBe(true);
    expect(CreditsRoll.isCredited('tester')).toBe(false);
    expect(CreditsRoll.isCredited('REGZPL')).toBe(false);
  });
});
