import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'drops',
  core: true,
  install: installNet,
});
