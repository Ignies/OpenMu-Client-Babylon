// Moves the Store's window-open flags into the interface controller's window manager:
// `Store.inventoryEnabled` -> `MuWindows.isOpen('inventory')`,
// `Store.inventoryEnabled = x` -> `MuWindows.setOpen('inventory', x)`.
// Usage: bun tools/restructure/storeFlagsToWindows.ts [--dry-run]
import ts from 'typescript';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const FLAGS: Record<string, string> = {
  inventoryEnabled: 'inventory',
  optionsEnabled: 'options',
  characterInfoEnabled: 'character_info',
  minimapEnabled: 'minimap',
  warpWindowEnabled: 'move_command',
  emoteMenuEnabled: 'emote_menu',
  skillListEnabled: 'skills',
  sessionStatsEnabled: 'session_stats',
};
const MANAGER = 'src/controllers/interface/windowManager.ts';
const dry = process.argv.includes('--dry-run');

const files = execSync('git ls-files src versions', { encoding: 'utf8' }).split('\n').filter(f => /\.tsx?$/.test(f));
let total = 0;
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  if (!Object.keys(FLAGS).some(f => raw.includes(f))) continue;
  const text = raw.replace(/\r\n/g, '\n');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits: [number, number, string][] = [];
  const isStore = file === 'src/app/store.ts';
  const target = (n: ts.Node): string | null => {
    if (!ts.isPropertyAccessExpression(n) || !(n.name.text in FLAGS)) return null;
    const obj = n.expression.getText(sf);
    if (obj === 'Store' || (isStore && obj === 'this')) return FLAGS[n.name.text];
    return null;
  };
  const visit = (n: ts.Node): void => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const id = target(n.left);
      if (id) {
        const right = n.right.getText(sf);
        // Rewrite reads inside the right side too (`x = !Store.inventoryEnabled`).
        const inner = right.replace(/\b(?:Store|this)\.(\w+Enabled)\b/g, (m, f: string) => (f in FLAGS ? `MuWindows.isOpen('${FLAGS[f]}')` : m));
        edits.push([n.getStart(sf), n.getEnd(), `MuWindows.setOpen('${id}', ${inner})`]);
        return;
      }
    }
    // Field declarations and the observable annotations in the Store go away.
    if (isStore && (ts.isPropertyDeclaration(n) || ts.isPropertyAssignment(n)) && ts.isIdentifier(n.name) && n.name.text in FLAGS) {
      edits.push([n.getFullStart(), n.getEnd() + (text[n.getEnd()] === ',' || text[n.getEnd()] === ';' ? 1 : 0), '']);
      return;
    }
    const id = target(n);
    if (id) {
      edits.push([n.getStart(sf), n.getEnd(), `MuWindows.isOpen('${id}')`]);
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  total += edits.length;
  let t = text;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) t = t.slice(0, a) + r + t.slice(b);
  if (!/\bMuWindows\b/.test(text) && t.includes('MuWindows.')) {
    const spec = '@/controllers/interface/windowManager';
    t = `import { MuWindows } from '${spec}';\n` + t;
  }
  console.log(`${edits.length}\t${file}`);
  if (!dry) writeFileSync(file, raw.includes('\r\n') ? t.replace(/\n/g, '\r\n') : t);
}
console.log(`${total} edits${dry ? ' (dry run)' : ''}; manager: ${MANAGER}`);
