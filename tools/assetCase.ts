import {
  MONSTER_MODEL_TABLE,
  monsterModelFile,
} from '../src/common/monsters/monsterModelTable';
import {
  NPC_MODEL_TABLE,
  npcModelFile,
} from '../src/common/npcs/npcModelTable';

/**
 * The original `Data/` tree spells one model family three ways -
 * `Monster100.bmd`, `monster105.bmd`, `MONSTER158.bmd` - and the converter
 * used to carry the source spelling straight into `public/game-assets`. The
 * client builds its request from its own tables (`Monster/Monster105.glb`), so
 * every oddly spelled model 404s on a case-sensitive host and the loader
 * stands a magenta box in its place. Windows never showed it.
 *
 * Conversion runs every output path through `canonicalAssetPath`, so the file
 * on disk is spelled the way the client asks for it regardless of how the
 * source BMD was spelled.
 */

/** Paths the client builds from a table, keyed by their lower-case form. */
const FROM_TABLES = new Map<string, string>();

for (const entry of Object.values(MONSTER_MODEL_TABLE)) {
  const path = monsterModelFile(entry[0]);
  FROM_TABLES.set(path.toLowerCase(), path);
}

for (const entry of Object.values(NPC_MODEL_TABLE)) {
  const path = npcModelFile(entry[0]);
  FROM_TABLES.set(path.toLowerCase(), path);
}

/**
 * Families the client numbers by rule instead of listing: the map object
 * folders and files (`Object<world>/Object<nn>.glb`, mapTileObject.ts and
 * operateBoxObject.ts), the monster models, and the terrain folders.
 */
const NUMBERED = [/^object(\d+)$/, /^monster(\d+)$/, /^world(\d+)$/];

const CAPITALS: Record<string, string> = {
  object: 'Object',
  monster: 'Monster',
  world: 'World',
};

function canonicalSegment(segment: string): string {
  const dot = segment.lastIndexOf('.');
  const stem = dot > 0 ? segment.slice(0, dot) : segment;
  const ext = dot > 0 ? segment.slice(dot) : '';
  const lower = stem.toLowerCase();

  for (const rule of NUMBERED) {
    const match = lower.match(rule);
    if (match)
      return CAPITALS[lower.slice(0, -match[1].length)] + match[1] + ext;
  }

  return segment;
}

/** `rel` is relative to the asset root, with `/` separators. */
export function canonicalAssetPath(rel: string): string {
  const fromTable = FROM_TABLES.get(rel.toLowerCase());
  if (fromTable) return fromTable;

  return rel.split('/').map(canonicalSegment).join('/');
}

/** Every model path the client asks for, in the case it asks for it. */
export function expectedModelPaths(): string[] {
  return [...FROM_TABLES.values()].sort();
}
