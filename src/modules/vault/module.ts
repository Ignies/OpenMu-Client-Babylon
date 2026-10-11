import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'vault',
  requires: ['economy'],
  install: installNet,
});
