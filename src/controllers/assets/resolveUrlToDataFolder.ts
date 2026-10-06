import { gameVersion } from '../../version';
import type { VersionData } from '../../version/contract';

const key = (url: string) => url.replace(/^[./]+/, '').toLowerCase();

/**
 * Where a converted asset is served from: the version's own tree, or the tree
 * it borrows every file it does not ship (`VersionData.borrows`).
 */
export function assetUrl(data: VersionData, url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('base64:')) return url;

  // Remove the leading slash if it exists
  if (url.startsWith('/') || url.startsWith('.')) {
    url = url.substring(1);
  }

  const borrows = data.borrows;
  if (borrows && !borrows.ownAssets.has(key(url)) && !borrows.lacks?.has(key(url))) {
    return `${borrows.assets}${url}`;
  }

  return `${data.assets}${url}`;
}

/** False for a converted file the version lacks although the tree it borrows has it. */
export function hasAsset(data: VersionData, url: string): boolean {
  return !data.borrows?.lacks?.has(key(url));
}

export function resolveUrlToDataFolder(url: string): string {
  // Read at call time, not module scope: this module sits on import chains
  // that evaluate before the version handle is assigned.
  return assetUrl(gameVersion.data, url);
}

/** `hasAsset` for the active version. */
export function hasAssetFile(url: string): boolean {
  return hasAsset(gameVersion.data, url);
}
