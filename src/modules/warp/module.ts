import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'warp',
  core: true,
  install: installNet,
});
