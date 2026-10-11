import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'hero',
  core: true,
  install: installNet,
});
