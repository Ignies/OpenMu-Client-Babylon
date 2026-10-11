import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'combat',
  core: true,
  install: installNet,
});
