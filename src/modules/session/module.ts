import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'session',
  core: true,
  install: installNet,
});
