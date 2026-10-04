import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'personal_shop',
  requires: ['economy'],
  install: installNet,
});
