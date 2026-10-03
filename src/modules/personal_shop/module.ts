import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'personal_shop',
  install: installNet,
});
