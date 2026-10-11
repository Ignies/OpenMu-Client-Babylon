import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'scope',
  core: true,
  install: installNet,
});
