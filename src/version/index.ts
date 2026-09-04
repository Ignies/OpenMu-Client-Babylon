/**
 * The resolved game version - the runtime end of `versions/registry.ts`.
 *
 * `main.tsx` awaits `loadGameVersion` before importing the app (`boot.tsx`),
 * so every module in the app graph - including the ones that read
 * `gameVersion` at module scope - evaluates after these bindings are
 * assigned. Base code keeps importing `gameVersion` from here and only ever
 * sees the `GameVersion` contract (`./contract.ts`).
 *
 * Switching to a world of another carried version is a page reload
 * (`ensureActiveVersion`): module-scope captures of the version exist
 * throughout the app, and a reload into the persisted selection is the
 * clean swap.
 */
import {
  DEFAULT_VERSION_ID,
  VERSION_REGISTRY,
  type VersionEntry,
  type VersionPackets,
  type VersionUi,
} from '../../versions/registry';
import type { GameVersion } from './contract';

export let gameVersion: GameVersion;
export let versionPackets: VersionPackets;

/**
 * The version a published server line asked for (`listTag`, e.g. `S6EP3`),
 * or null when this client does not carry it. Case-insensitive: the tag is
 * somebody's markdown, not an identifier. Registry metadata only - asking
 * never loads a version body.
 */
export function versionByTag(tag: string): VersionEntry | null {
  const wanted = tag.trim().toLowerCase();

  return (
    VERSION_REGISTRY.find(v => v.listTag.toLowerCase() === wanted) ?? null
  );
}

/** The tags this client can be asked for, for a message that has to list them. */
export function versionTags(): string[] {
  return VERSION_REGISTRY.map(v => v.listTag);
}

/**
 * Registry id for a server profile's `version` tag. No tag (a typed-in
 * address, an old list line) and an uncarried tag both mean the default:
 * the world is entered with what this client picks.
 */
export function versionIdForTag(tag: string | undefined): string {
  if (!tag) return DEFAULT_VERSION_ID;

  return versionByTag(tag)?.id ?? DEFAULT_VERSION_ID;
}

/** Loads a version's core (contract data + packet lists). No app code runs here. */
export async function loadGameVersion(id: string): Promise<void> {
  const entry =
    VERSION_REGISTRY.find(v => v.id === id) ??
    VERSION_REGISTRY.find(v => v.id === DEFAULT_VERSION_ID)!;
  const mod = await entry.load();

  gameVersion = mod.gameVersion;
  versionPackets = mod.packets;
}

let uiPromise: Promise<VersionUi> | null = null;

/**
 * The active version's UI module, loaded on first use (React.lazy in
 * worldPage). Never before boot: version UI re-exports app components, and
 * evaluating those ahead of the app graph reorders module init.
 */
export function loadVersionUi(): Promise<VersionUi> {
  uiPromise ??= VERSION_REGISTRY.find(v => v.id === gameVersion.id)!.loadUi();

  return uiPromise;
}

/**
 * Connect-time guard: true when the active world is played by the loaded
 * version. Otherwise reloads into it - the selection is already persisted,
 * and boot resolves the version from the same tag through `versionIdForTag`,
 * so the reload cannot loop.
 */
export function ensureActiveVersion(tag: string | undefined): boolean {
  if (versionIdForTag(tag) === gameVersion.id) return true;

  location.reload();

  return false;
}

export type {
  GameVersion,
  GameVersionId,
  VersionData,
  VersionEncryption,
  VersionFeatures,
  VersionProtocol,
} from './contract';
