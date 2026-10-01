// Splits src/app/logic.ts (one file of packet handlers) into one net.ts per
// feature. Handlers keep their original order; logic.ts becomes the list of
// feature nets in that order. Usage: bun tools/restructure/splitHandlers.ts [--dry-run]
import ts from 'typescript';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, posix } from 'path';

const SRC = 'src/app/logic.ts';
const SHARED = 'src/features/_shared/net_helpers.ts';
const dry = process.argv.includes('--dry-run');
const F = (f: string) => `src/features/${f}/net.ts`;

/** Packet / event name -> feature. First match wins. */
const ROUTES: [RegExp, string][] = [
  [/^(Hello|GameServerEntered|ServerListResponse|wsClosed|ConnectionInfo|LoginResponse|LogoutResponse|ChangeMapServerInfo)$/, 'session'],
  [/^Character(DeleteResponse|ClassCreationUnlock|CreationSuccessful|CreationFailed)$/, 'character_select'],
  [/^(MapChanged|warpCompleted)$/, 'warp'],
  [/^(Add\w*ToScope\w*|SummonHealthUpdate|MapObjectOutOfScope|ObjectMoved|ObjectWalked|AppearanceChanged\w*)$/, 'scope'],
  [/^(ChatMessage|ObjectMessage|ServerMessage)$/, 'chat'],
  [/^(WeatherStatusUpdate|ShowEffect|ShowSwirl|fanfare)$/, 'world'],
  [/^Party|^RemovePartyMember$/, 'party'],
  [/^(GuildWar|GuildSoccer|GuildRelationship|AllianceList|RemoveAllianceGuild)/, 'guild_war'],
  [/^(Guild|AssignCharacterToGuild|ShowGuild)/, 'guild'],
  [/^(Messenger|Friend|ChatRoomConnectionInfo|AddLetter|OpenLetter|RemoveLetter|LetterSendResponse)/, 'friends'],
  [/^(ObjectAnimation|ObjectGotKilled|ObjectHit\w*|RageAttack\w*)$/, 'combat'],
  [/^(SkillAnimation|AreaSkillAnimation|MagicEffect\w+|Skill(ListUpdate|Added|Removed)|ChainLightningHitInfo)$/, 'skills'],
  [/^(MoneyDropped\w*|ItemsDropped|ItemDropRemoved|ItemDropResponse|ItemPickUpRequestFailed)$/, 'drops'],
  [/^(CharacterInventory|ItemMoved|ItemMoveRequestFailed|ItemAddedToInventory|ItemRemoved|InventoryItemUpgraded|ItemConsumptionFailed|ItemDurabilityChanged|InventoryMoneyUpdate)$/, 'inventory'],
  [/^MarketplaceEscrowResult$/, 'marketplace'],
  [/^(NpcWindowResponse|StoreItemList|ItemBought|NpcItemBuyFailed|NpcItemSellResult)$/, 'npc_shop'],
  [/^OpenNpcDialog$/, 'quests'],
  [/^Vault/, 'vault'],
  [/^(ItemCraftingResult|CraftingDialogClosed075)$/, 'chaos_mix'],
  [/^Trade/, 'trade'],
  [/^(PlayerShop|ClosePlayerShopDialog)/, 'personal_shop'],
  [/^ApplyKeyConfiguration$/, 'options'],
  [/^Pet/, 'pets'],
  [/^MuHelper/, 'mu_helper'],
  [/^(CharacterInformation\w*|Current\w+|Maximum\w+|HeroStateChanged|RespawnAfterDeath\w*|PoisonDamage|CharacterStatIncrease\w*|CharacterLevelUpdate\w*|MasterCharacterLevelUpdate\w*|ExperienceGained\w*|FruitConsumptionResponse|BaseStatsExtended)$/, 'hero'],
];
const routeOf = (event: string): string => {
  const hit = ROUTES.find(([re]) => re.test(event));
  if (!hit) throw new Error(`no route for ${event}`);
  return F(hit[1]);
};

const raw = readFileSync(SRC, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const text = raw.replace(/\r\n/g, '\n');
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

function isDeclName(n: ts.Identifier): boolean {
  const p = n.parent;
  if (ts.isPropertyAccessExpression(p) && p.name === n) return true;
  if (ts.isQualifiedName(p) && p.right === n) return true;
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isMethodSignature(p) || ts.isEnumMember(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p)) && p.name === n) return true;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p) || ts.isTypeParameterDeclaration(p) || ts.isEnumDeclaration(p)) && p.name === n) return true;
  if (ts.isBindingElement(p) && (p.name === n || p.propertyName === n)) return true;
  if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) return true;
  return false;
}
function scan(node: ts.Node) {
  const refs = new Set<string>();
  const assigns = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && !isDeclName(n)) refs.add(n.text);
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ts.isIdentifier(n.left)) assigns.add(n.left.text);
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && ts.isIdentifier(n.operand) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) assigns.add(n.operand.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return { refs, assigns };
}
function declaredNames(s: ts.Statement): string[] {
  if (ts.isVariableStatement(s)) return s.declarationList.declarations.flatMap(d => (ts.isIdentifier(d.name) ? [d.name.text] : []));
  if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isEnumDeclaration(s)) && s.name) return [s.name.text];
  return [];
}
/** `EventBus.on('X', ...)` at the top of a statement, or a loop that registers several. */
function eventsOf(s: ts.Statement): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.getText(sf) === 'EventBus.on') {
      const a = n.arguments[0];
      if (a && ts.isStringLiteralLike(a)) out.push(a.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(s);
  return out;
}

type Binding = { spec: string; name: string; alias: string; typeOnly: boolean };
const imports = new Map<string, Binding>();
const importOrder: ts.ImportDeclaration[] = [];
type Unit = { id: string; names: string[]; text: string; start: number; refs: Set<string>; assigns: Set<string>; module?: string; exported: boolean; isLet: boolean; events: string[]; sideEffect: boolean };
const units: Unit[] = [];
const byName = new Map<string, Unit>();

for (const s of sf.statements) {
  if (ts.isImportDeclaration(s)) {
    importOrder.push(s);
    const spec = (s.moduleSpecifier as ts.StringLiteral).text;
    const c = s.importClause;
    if (!c) continue;
    if (c.name) imports.set(c.name.text, { spec, name: 'default', alias: c.name.text, typeOnly: c.isTypeOnly });
    const nb = c.namedBindings;
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) imports.set(e.name.text, { spec, name: (e.propertyName ?? e.name).text, alias: e.name.text, typeOnly: c.isTypeOnly || e.isTypeOnly });
    if (nb && ts.isNamespaceImport(nb)) imports.set(nb.name.text, { spec, name: '*', alias: nb.name.text, typeOnly: c.isTypeOnly });
    continue;
  }
  const names = declaredNames(s);
  const { refs, assigns } = scan(s);
  for (const n of names) refs.delete(n);
  const events = names.length ? [] : eventsOf(s);
  const prev = names.length ? byName.get(names[0]) : undefined;
  if (prev) { prev.text += text.slice(s.getFullStart(), s.getEnd()); for (const r of refs) prev.refs.add(r); continue; }
  const u: Unit = {
    id: names[0] ?? `stmt@${sf.getLineAndCharacterOfPosition(s.getStart(sf)).line + 1}`,
    names, text: text.slice(s.getFullStart(), s.getEnd()), start: s.getStart(sf), refs, assigns,
    exported: !!ts.getModifiers(s as ts.HasModifiers)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword),
    isLet: ts.isVariableStatement(s) && (s.declarationList.flags & ts.NodeFlags.Let) !== 0,
    events, sideEffect: names.length === 0,
  };
  if (events.length) {
    const mods = new Set(events.map(routeOf));
    // The fireworks / fanfare command loop registers several world events at once.
    u.module = mods.size === 1 ? [...mods][0] : F('world');
  } else if (u.sideEffect) u.module = SRC; // timers, installs, hot reload guard
  units.push(u);
  for (const n of names) byName.set(n, u);
}

// Keep a let together with whoever assigns it.
const group = new Map<Unit, Unit>();
const find = (u: Unit): Unit => (group.get(u) && group.get(u) !== u ? find(group.get(u)!) : u);
for (const u of units) for (const a of u.assigns) { const t = byName.get(a); if (t && t !== u && t.isLet) group.set(find(u), find(t)); }

const referencers = new Map<Unit, Unit[]>();
for (const u of units) for (const n of u.refs) { const t = byName.get(n); if (t && t !== u) (referencers.get(t) ?? referencers.set(t, []).get(t)!).push(u); }
const external = new Set(['spawnPlayer']); // imported by other files: stays reachable through logic.ts
let progress = true;
while (progress) {
  progress = false;
  for (const u of units) {
    if (u.module) continue;
    const g = find(u);
    const members = units.filter(x => find(x) === g);
    // A group with a fixed member goes where that member is.
    const fixed = members.find(m => m.module);
    if (fixed) { for (const m of members) m.module = fixed.module; progress = true; continue; }
    const by = members.flatMap(m => referencers.get(m) ?? []).filter(x => find(x) !== g);
    if (by.some(x => !x.module)) continue;
    const mods = new Set(by.map(x => x.module!));
    if (members.some(m => m.names.some(n => external.has(n))) && mods.size === 0) mods.add(F('scope'));
    const target = mods.size === 0 ? SRC : mods.size === 1 ? [...mods][0] : mods.has(SRC) ? SRC : SHARED;
    for (const m of members) m.module = target;
    progress = true;
  }
}
for (const u of units) if (!u.module) { u.module = SHARED; console.warn(`cycle -> shared: ${u.id}`); }

// Listener order per event must survive: modules are loaded in first-appearance order.
const moduleOrder: string[] = [];
for (const u of [...units].sort((a, b) => a.start - b.start)) if (u.events.length && !moduleOrder.includes(u.module!)) moduleOrder.push(u.module!);
const firstIdx = (m: string) => moduleOrder.indexOf(m);
const perEvent = new Map<string, string[]>();
for (const u of [...units].sort((a, b) => a.start - b.start)) for (const e of u.events) (perEvent.get(e) ?? perEvent.set(e, []).get(e)!).push(u.module!);
for (const [e, mods] of perEvent) for (let i = 1; i < mods.length; i++) if (firstIdx(mods[i]) < firstIdx(mods[i - 1])) throw new Error(`listener order of ${e} would change: ${mods.join(' -> ')}`);

const perModule = new Map<string, Unit[]>();
for (const u of units) (perModule.get(u.module!) ?? perModule.set(u.module!, []).get(u.module!)!).push(u);
console.log(`${units.length} statements, ${[...perModule.keys()].length} modules`);
for (const [m, us] of [...perModule].sort()) console.log(`${String(us.reduce((n, u) => n + u.text.split('\n').length, 0)).padStart(6)} lines ${String(us.filter(u => u.events.length).length).padStart(3)} handlers  ${m}`);
if (dry) process.exit(0);

// ---- emit --------------------------------------------------------------------
for (const u of units) {
  if (u.exported) continue;
  if (units.some(v => v.module !== u.module && u.names.some(n => v.refs.has(n)))) u.exported = true;
}
function specFrom(from: string, target: string): string {
  const noExt = target.replace(/\.tsx?$/, '').replace(/\/index$/, '');
  if (noExt.startsWith('src/')) {
    const rel = posix.relative(posix.dirname(from), noExt);
    const r = rel.startsWith('.') ? rel : './' + rel;
    return r.startsWith('../../') ? '@/' + noExt.slice(4) : r;
  }
  if (noExt.startsWith('versions/')) return '@versions/' + noExt.slice(9);
  return target;
}
const targetOf = (b: Binding) => (b.spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(SRC), b.spec)) : b.spec.startsWith('@/') ? 'src/' + b.spec.slice(2) : b.spec.startsWith('@versions/') ? 'versions/' + b.spec.slice(10) : b.spec);
function importsFor(module: string, refs: Set<string>): string {
  const groups = new Map<string, { names: Set<string>; types: Set<string>; def?: string; ns?: string }>();
  const g = (spec: string) => groups.get(spec) ?? groups.set(spec, { names: new Set(), types: new Set() }).get(spec)!;
  for (const n of [...refs].sort()) {
    const b = imports.get(n);
    if (b) {
      const t = targetOf(b);
      const spec = t.startsWith('src/') || t.startsWith('versions/') ? specFrom(module, t) : t;
      const e = g(spec);
      if (b.name === 'default') e.def = b.alias;
      else if (b.name === '*') e.ns = b.alias;
      else (b.typeOnly ? e.types : e.names).add(b.name === b.alias ? b.name : `${b.name} as ${b.alias}`);
      continue;
    }
    const home = byName.get(n)?.module;
    if (home && home !== module) g(specFrom(module, home)).names.add(n);
  }
  const out: string[] = [];
  for (const [spec, e] of groups) {
    if (e.ns) out.push(`import * as ${e.ns} from '${spec}';`);
    const named = [...e.names, ...[...e.types].map(t => `type ${t}`)];
    if (e.def || named.length) out.push(`import ${[e.def, named.length ? `{ ${named.join(', ')} }` : ''].filter(Boolean).join(', ')} from '${spec}';`);
  }
  return out.join('\n');
}
const exportRe = /^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)(?=(const|let|function|interface|type|class|enum|async)\b)/;
const withExport = (u: Unit) => (u.exported && !/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*export\s/.test(u.text) ? u.text.replace(exportRe, '$1export ') : u.text);
// Side-effect-only imports (`import './x'`) keep their place at the top of logic.ts.
const bareImports = importOrder.filter(i => !i.importClause).map(i => text.slice(i.getStart(sf), i.getEnd()));

const write = (path: string, body: string) => {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) throw new Error(`${path} exists`);
  writeFileSync(path, body.replace(/\n{3,}/g, '\n\n').trimStart().replace(/\n/g, nl));
};
for (const [m, us] of perModule) {
  if (m === SRC) continue;
  const refs = new Set<string>();
  for (const u of us) for (const r of u.refs) refs.add(r);
  for (const u of us) for (const n of u.names) refs.delete(n);
  const head = m === SHARED ? '// Helpers more than one feature net uses.\n' : '';
  write(m, `${head}${importsFor(m, refs)}\n${[...us].sort((a, b) => a.start - b.start).map(withExport).join('')}\n`);
}
// logic.ts: the feature nets in order, then what stays at app level.
const stay = (perModule.get(SRC) ?? []).sort((a, b) => a.start - b.start);
const stayRefs = new Set<string>();
for (const u of stay) for (const r of u.refs) stayRefs.add(r);
const reexports = units.filter(u => u.module !== SRC && /^export\s/.test(text.slice(u.start, u.start + 7)));
const body = [
  '// Every packet handler lives in its feature\'s net.ts; importing them here registers them,',
  '// in the order the handlers had in this file (listener order per packet is kept).',
  ...bareImports,
  ...moduleOrder.filter(m => m !== SRC).map(m => `import '${specFrom(SRC, m)}';`),
  importsFor(SRC, stayRefs),
  ...reexports.map(u => `export { ${u.names.join(', ')} } from '${specFrom(SRC, u.module!)}';`),
  stay.map(withExport).join(''),
  '',
].join('\n');
writeFileSync(SRC, body.replace(/\n{3,}/g, '\n\n').replace(/\n/g, nl));
console.log('done');
