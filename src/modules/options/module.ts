import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'options',
  core: true,
  install: installNet,
});
