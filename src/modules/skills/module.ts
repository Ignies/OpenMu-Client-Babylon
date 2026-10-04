import { defineModule } from '../module';
import { installNet } from './net';
import { installMasterLevel } from './masterLevel';
import { installMasterTree } from './masterTree';

export default defineModule({
  id: 'skills',
  core: true,
  install() {
    installMasterLevel();
    installMasterTree();
    installNet();
  },
});
