import { gameVersion } from '../version';

export function resolveUrlToDataFolder(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('base64:')) return url;

  // Remove the leading slash if it exists
  if (url.startsWith('/') || url.startsWith('.')) {
    url = url.substring(1);
  }

  // Read at call time, not module scope: this module sits on import chains
  // that evaluate before the version handle is assigned.
  return `${gameVersion.data.assets}${url}`;
}
