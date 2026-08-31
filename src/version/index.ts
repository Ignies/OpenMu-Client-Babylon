/**
 * Thin loader: the selected game version (`VITE_GAME_VERSION`, default
 * `season6`) as `gameVersion`, plus the contract types. Base code imports
 * this (`from '../version'`) or `@version` directly; either way it only ever
 * sees the `GameVersion` contract (`./contract.ts`). 
 */
import { gameVersion } from '@version';
import type { GameVersion } from './contract';

export { gameVersion };

/**
 * Every version this client carries.
 *
 * One entry today, because `@version` is a build-time alias and a build
 * resolves it to a single folder. The plan is for `versions/` to ship all of
 * them in one client, and this is the seam that changes when it does: add the
 * folders here and everything that asks "can we play that world?" starts
 * answering yes without being touched.
 */
export const GAME_VERSIONS: readonly GameVersion[] = [gameVersion];

/**
 * The version a published server line asked for (`gameVersion.listTag`, e.g.
 * `S6EP3`), or null when this client does not carry it. Case-insensitive: the
 * tag is somebody's markdown, not an identifier.
 */
export function versionByTag(tag: string): GameVersion | null {
  const wanted = tag.trim().toLowerCase();

  return (
    GAME_VERSIONS.find(v => v.listTag.toLowerCase() === wanted) ?? null
  );
}

/** The tags this client can be asked for, for a message that has to list them. */
export function versionTags(): string[] {
  return GAME_VERSIONS.map(v => v.listTag);
}
export type {
  GameVersion,
  GameVersionId,
  VersionData,
  VersionEncryption,
  VersionFeatures,
  VersionProtocol,
} from './contract';
