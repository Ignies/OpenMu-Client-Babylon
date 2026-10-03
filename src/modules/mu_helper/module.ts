import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'mu_helper',
  install: installNet,
});
