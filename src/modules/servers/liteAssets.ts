import { isOn } from '../../controllers/fidelity';
import { loadServerManifest, serverSetting } from './serverManifest';

/**
 * Whether reads take the lighter copies (`controllers/assets/liteAssets.ts`): the player's
 * `liteAssets` improvement (off on Classic) and the world's `server.json`, which says its build wrote
 * them. Installed as the assets gate by `module.ts`.
 */
export function liteAssetsAllowed(): boolean {
  return isOn('liteAssets') && serverSetting('liteAssets');
}

/** `liteAssetsAllowed` once the world's `server.json` has answered (the first-run download asks before it starts). */
export async function liteAssetsReady(): Promise<boolean> {
  await loadServerManifest();
  return liteAssetsAllowed();
}
