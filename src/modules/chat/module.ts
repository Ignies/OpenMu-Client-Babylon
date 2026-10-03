import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'chat',
  core: true,
  install: installNet,
});
