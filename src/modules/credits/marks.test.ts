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
const { ContributorMarks, markedNames } = await import('./marks');

describe('markedNames', () => {
  it('marks the contributors with commits, by name, in any case', () => {
    expect([...markedNames(LIST, {})].sort()).toEqual(['helper', 'ignies']);
  });

  it('matches a contributor in the character list by those characters only', () => {
    expect([...markedNames(LIST, { ignies: ['RaiN', 'Kaze'] })].sort()).toEqual(['helper', 'kaze', 'rain']);
  });
});

describe('ContributorMarks', () => {
  it('reads the shared credits once, then answers by character name', async () => {
    expect(ContributorMarks.isMarked('Ignies')).toBe(false);
    const was = ContributorMarks.version;
    ContributorMarks.request();
    ContributorMarks.request();
    await vi.waitFor(() => expect(ContributorMarks.version).toBe(was + 1));
    expect(ContributorMarks.isMarked('IGNIES')).toBe(true);
    expect(ContributorMarks.isMarked('tester')).toBe(false);
    expect(ContributorMarks.isMarked('REGZPL')).toBe(false);
  });
});
