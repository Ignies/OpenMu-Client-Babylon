import { defineModule } from '../module';

// State and actions only: the connect server's answers are read by session/net.ts.
export default defineModule({
  id: 'servers',
  core: true,
  install() {},
});
