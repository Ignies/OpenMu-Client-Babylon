import type { AssetGroup } from '@/controllers/assets/assetDownload';

/**
 * What the first-run screen waits for: everything but the music and the maps other than the login
 * scene and the main towns (Lorencia, Devias, Noria, Elbeland, the character scene). Map groups go by
 * their index id (`map:<world folder>`). The rest follows behind the small panel.
 */
const ESSENTIAL_MAPS = new Set(['map:1', 'map:3', 'map:4', 'map:52', 'map:74']);

export function isEssential(group: AssetGroup): boolean {
  return group.kind === 'map' ? ESSENTIAL_MAPS.has(group.id) : group.kind !== 'audio';
}

/** The build this browser last finished a full first-run download for. */
export const DONE_KEY = 'mu_auto_download_build';

/** A build not yet fully downloaded here runs it again (cached files are skipped). */
export function firstRunDue(doneBuild: string | null, build: string): boolean {
  return doneBuild !== build;
}

/** The group a run is in, from the bytes received: `startDownload` fetches groups in index order. */
export function currentGroup(groups: readonly AssetGroup[], chosen: (g: AssetGroup) => boolean, received: number): AssetGroup | undefined {
  let bytes = 0;
  for (const group of groups) {
    if (!chosen(group)) continue;
    bytes += group.bundle?.bytes ?? group.bytes;
    if (received < bytes) return group;
  }
  return undefined;
}
