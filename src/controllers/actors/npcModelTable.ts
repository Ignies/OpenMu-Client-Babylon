import { monsterRegistry, type MonsterDef } from '@/controllers/monsters';
import { CHARACTER_DEFAULT_SCALE } from './monsterModelTable';

/**
 * The NPC tables as they were before the data moved into the monster folders
 * (versions/shared/monsters/<name>/index.ts), kept for readers that list them. Each is a live view:
 * it reads the folders on every access, so it is right whenever it is read, even before a version
 * has loaded. New code reads the folder (`monsterRegistry.def(type)`) instead.
 */
export function folderTable<K extends keyof MonsterDef, R>(
  key: K,
  row: (value: NonNullable<MonsterDef[K]>) => R
): Readonly<Record<number, R>> {
  const read = (type: string | symbol) => {
    const value = typeof type === 'string' ? monsterRegistry.def(Number(type))?.[key] : undefined;
    return value == null ? undefined : row(value as NonNullable<MonsterDef[K]>);
  };
  return new Proxy({} as Record<number, R>, {
    get: (_, type) => read(type),
    has: (_, type) => read(type) !== undefined,
    ownKeys: () => monsterRegistry.having(key).map(([type]) => String(type)),
    getOwnPropertyDescriptor: (_, type) => {
      const value = read(type);
      return value === undefined ? undefined : { value, enumerable: true, configurable: true, writable: false };
    },
  });
}

/** `type: [file, scale]` for every folder with an `npcModel`. */
export const NPC_MODEL_TABLE: Readonly<Record<number, readonly [file: string, scale: number]>> = folderTable(
  'npcModel',
  m => [m.file, m.scale ?? CHARACTER_DEFAULT_SCALE] as const
);

/** `type: [modelIndex, castsShadow]` for every trap folder. */
export const TRAP_MODEL_TABLE: Readonly<Record<number, readonly [modelIndex: number, castsShadow: boolean]>> =
  folderTable('trap', t => [t.object, t.shadow] as const);

/**
 * Entries are relative to `Data/NPC/` - the folder `OpenNpc` loads from. A
 * handful of types the server spawns as NPCs are props whose model lives
 * elsewhere (`Data/Skill`, `Data/Object35`, `Data/Item`); those are written
 * with a leading `/` and resolve against the asset root instead.
 */
export function npcModelFile(file: string): string {
  return file.startsWith('/') ? `${file.slice(1)}.glb` : `NPC/${file}.glb`;
}
