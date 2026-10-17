import { defineModule } from '../module';
import { setLiteAssetsGate } from '../../controllers/assets/liteAssets';
import { liteAssetsAllowed } from './liteAssets';

// State and actions only: the connect server's answers are read by session/net.ts.
export default defineModule({
  id: 'servers',
  core: true,
  install() {
    // The asset reads ask the player's option and the world's server.json for the lighter copies.
    setLiteAssetsGate(liteAssetsAllowed);
  },
});
