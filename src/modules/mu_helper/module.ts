import { defineModule } from '../module';
import { installNet } from './net';
import { installResume } from './resume';

export default defineModule({
  id: 'mu_helper',
  install: () => {
    installNet();
    installResume();
  },
});
