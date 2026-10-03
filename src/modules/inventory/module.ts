import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'inventory',
  core: true,
  install: installNet,
});
