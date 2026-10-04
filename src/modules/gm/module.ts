import { defineModule } from '../module';

// The game master panel, command catalogue, admin feed and offline debug menu: windows and state
// only, no packets of their own. Nothing to install.
export default defineModule({
  id: 'gm',
  install() {},
});
