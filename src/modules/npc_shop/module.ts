import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'npc_shop',
  core: true,
  install: installNet,
});
