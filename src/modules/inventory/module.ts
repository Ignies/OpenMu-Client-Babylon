import { defineModule } from '../module';
import { installAutoMana } from './autoMana';
import { installNet } from './net';

export default defineModule({
  id: 'inventory',
  core: true,
  install: () => {
    installNet();
    installAutoMana();
  },
});
