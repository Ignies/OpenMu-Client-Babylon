import { defineModule } from '../module';
import { installBandNet } from './bandNet';

export default defineModule({
  id: 'band',
  install: installBandNet,
});
