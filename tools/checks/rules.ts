// Dependency rules. Each rule names what a folder may not import. Existing
// violations are listed in baselines/deps.json; a new one fails the check.
import type { Edge } from './graph';

export type Rule = { name: string; why: string; test: (e: Edge) => boolean };

const under = (p: string, dir: string) => p.startsWith(dir);
const isTest = (p: string) => /\.test\.tsx?$/.test(p);

/** Content folders: what a version may load. Data tables (packets, databases, enums) are not content. */
const CONTENT = ['versions/shared/skills/', 'versions/shared/ui/', 'versions/shared/maps/', 'versions/shared/monsters/', 'versions/shared/npcs/'];
const isContent = (p: string) => CONTENT.some(c => under(p, c)) && !/Database\.ts$/.test(p);

export const RULES: Rule[] = [
  {
    name: 'core-is-standalone',
    why: 'src/core is imported by everything, so it imports nothing of the game',
    test: e => under(e.from, 'src/core/') && !isTest(e.from) && !under(e.to, 'src/core/') && !under(e.to, 'versions/shared/packets/'),
  },
  {
    name: 'controllers-are-generic',
    why: 'a controller never imports a feature, the app or content; content registers itself into the controller',
    test: e => under(e.from, 'src/controllers/') && !isTest(e.from) && (under(e.to, 'src/features/') || under(e.to, 'src/app/') || isContent(e.to)),
  },
  {
    name: 'features-do-not-draw',
    why: 'a feature owns state and packets; windows read it, never the other way round',
    test: e => under(e.from, 'src/features/') && !isTest(e.from) && (under(e.to, 'versions/shared/ui/') || under(e.to, 'src/app/App')),
  },
  {
    name: 'windows-use-features-not-store',
    why: 'a window reads its feature and calls its actions; the Store is being split into features',
    test: e => under(e.from, 'versions/shared/ui/') && e.to === 'src/app/store.ts',
  },
  {
    name: 'versions-do-not-reach-into-app',
    why: 'version folders hold data and overrides; the app wires them, not the other way round',
    test: e => under(e.from, 'versions/') && !under(e.from, 'versions/shared/ui/') && under(e.to, 'src/app/') && !isTest(e.from),
  },
];

export const edgeKey = (rule: string, e: Edge) => `${rule}: ${e.from} -> ${e.to}`;
