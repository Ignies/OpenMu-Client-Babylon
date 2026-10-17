import { isOn } from '../../controllers/fidelity';
import { serverSetting } from './serverManifest';

/**
 * Whether reads take the lighter copies (`controllers/assets/liteAssets.ts`): the player's
 * `liteAssets` improvement (off on Classic) and the world's `server.json`, which says its build wrote
 * them. Installed as the assets gate by `module.ts`.
 */
export function liteAssetsAllowed(): boolean {
  return isOn('liteAssets') && serverSetting('liteAssets');
}
