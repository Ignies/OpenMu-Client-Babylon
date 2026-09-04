/**
 * THE REGISTRY of game versions this client ships. One build carries every
 * entry; exactly one is active per page load, picked at runtime from the
 * server-list entry (src/version/index.ts `loadGameVersion`).
 *
 * Entry metadata (`id`, `label`, `listTag`) is eager so the server picker
 * can answer "can this client play that world?" without loading a version
 * body; the bodies come in through the two dynamic imports, each its own
 * chunk, so a version the player never touches is never fetched.
 *
 * Invariant: a version's `index.ts` (the `load()` module) must import only
 * the contract, generated packet files and its own data - never app code.
 * App modules read `gameVersion` at module scope, so they may evaluate only
 * after `load()` resolved; version UI reaches app code, which is why it
 * sits behind the separate `loadUi()`.
 */
import type { ComponentType } from 'react';
import type { GameVersion, GameVersionId } from '../src/version/contract';

/**
 * The three packet lists a version exports. Typed against the season6 set
 * for now; step (b) widens these to a union of the shipped versions' lists
 * so the EventBus keeps literal packet-name keys for all of them.
 */
export type VersionPackets = {
  ServerToClientPackets: typeof import('./season6/packets')['ServerToClientPackets'];
  ClientToServerPackets: typeof import('./season6/packets')['ClientToServerPackets'];
  ConnectServerPackets: typeof import('./season6/packets')['ConnectServerPackets'];
  ChangeMapServerInfoPacket: typeof import('./season6/packets')['ChangeMapServerInfoPacket'];
};

/** What `versions/<id>/index.ts` exports. */
export type VersionModule = {
  gameVersion: GameVersion;
  packets: VersionPackets;
};

/**
 * What `versions/<id>/ui/index.tsx` exports: every window of the richest
 * version, by name; a version without one exports a null-rendering
 * component (versions/_template/ui).
 */
export type VersionUi = {
  MasterSkillsWindow: ComponentType;
};

export type VersionEntry = {
  readonly id: GameVersionId;
  /** Human label for pickers and logs. Must match the module's `gameVersion.label`. */
  readonly label: string;
  /** The token a published server line leads with. Must match `gameVersion.listTag`. */
  readonly listTag: string;
  readonly load: () => Promise<VersionModule>;
  readonly loadUi: () => Promise<VersionUi>;
};

export const DEFAULT_VERSION_ID: GameVersionId = 'season6';

export const VERSION_REGISTRY: readonly VersionEntry[] = [
  {
    id: 'season6',
    label: 'Season 6 Episode 3',
    listTag: 'S6EP3',
    load: () => import('./season6'),
    loadUi: () => import('./season6/ui'),
  },
];
