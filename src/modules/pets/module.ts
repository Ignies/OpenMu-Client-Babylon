import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'pets',
  install: installNet,
});
