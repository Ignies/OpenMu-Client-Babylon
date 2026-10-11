import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'world',
  core: true,
  install: installNet,
});
