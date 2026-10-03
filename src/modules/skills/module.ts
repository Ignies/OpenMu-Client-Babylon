import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'skills',
  core: true,
  install: installNet,
});
