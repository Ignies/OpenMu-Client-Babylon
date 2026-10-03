import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'character_select',
  core: true,
  install: installNet,
});
