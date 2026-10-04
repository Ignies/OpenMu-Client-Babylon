import { defineModule } from '../module';
import { installNet } from './net';
import { installScopeHold } from './warpScopeHold';

export default defineModule({
  id: 'warp',
  core: true,
  install() {
    installScopeHold();
    installNet();
  },
});
