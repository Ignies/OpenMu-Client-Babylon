import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'chaos_mix',
  install: installNet,
});
