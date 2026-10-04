// Dependency rules. Each rule names what a folder may not import. Existing
// violations are listed in baselines/deps.json; a new one fails the check.
import type { Edge } from './graph';

export type Rule = { name: string; why: string; test: (e: Edge) => boolean };

const under = (p: string, dir: string) => p.startsWith(dir);
const isTest = (p: string) => /\.test\.tsx?$/.test(p);

/** Content folders: what a version may load. Data tables (packets, databases, enums) are not content. */
const CONTENT = ['versions/shared/skills/', 'versions/shared/ui/', 'versions/shared/maps/', 'versions/shared/monsters/'];
const isContent = (p: string) => CONTENT.some(c => under(p, c)) && !/Database\.ts$/.test(p);

export const RULES: Rule[] = [
  {
    name: 'core-is-standalone',
    why: 'src/core is imported by everything, so it imports nothing of the game',
    test: e => under(e.from, 'src/core/') && !isTest(e.from) && !under(e.to, 'src/core/') && !under(e.to, 'versions/shared/packets/'),
  },
  {
    name: 'controllers-are-generic',
    why: 'a controller never imports a module, the app or content; content registers itself into the controller',
    test: e => under(e.from, 'src/controllers/') && !isTest(e.from) && (under(e.to, 'src/modules/') || under(e.to, 'src/app/') || isContent(e.to)),
  },
  {
    name: 'modules-do-not-draw',
    why: 'a module owns state and packets; windows read it, never the other way round',
    test: e => under(e.from, 'src/modules/') && !isTest(e.from) && (under(e.to, 'versions/shared/ui/') || under(e.to, 'src/app/App')),
  },
  {
    name: 'only-the-app-imports-the-app',
    why: 'src/app wires everything at boot (installs the modules, mounts the pages); nothing it wires may depend on it',
    test: e => under(e.to, 'src/app/') && !under(e.from, 'src/app/') && !isTest(e.from),
  },
];

export const edgeKey = (rule: string, e: Edge) => `${rule}: ${e.from} -> ${e.to}`;
