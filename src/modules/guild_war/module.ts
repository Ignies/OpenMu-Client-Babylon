import { defineModule } from '../module';
import { installNet } from './net';

export default defineModule({
  id: 'guild_war',
  requires: ['guild'],
  install: installNet,
});
