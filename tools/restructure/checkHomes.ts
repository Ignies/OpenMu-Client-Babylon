// Verifies every skill file sits where skillHome() says its id lives.
import { readdirSync, readFileSync, statSync } from 'fs';
import { skillHome } from './skillHomes';
const walk = (d: string): string[] => readdirSync(d).flatMap(e => (statSync(`${d}/${e}`).isDirectory() ? walk(`${d}/${e}`) : [`${d}/${e}`]));
let bad = 0;
for (const f of walk('versions/shared/skills').filter(f => f.endsWith('.ts'))) {
  const m = readFileSync(f, 'utf8').match(/defineSkill\(\{\s*id: (\d+)/);
  if (!m) continue;
  const want = skillHome(Number(m[1])).file;
  if (want !== f) { bad++; console.log(`${f} -> ${want}`); }
}
console.log(bad ? `${bad} misplaced` : 'all skill files in place');
process.exit(bad ? 1 : 0);
