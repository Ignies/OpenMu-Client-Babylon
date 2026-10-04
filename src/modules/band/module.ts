import { defineModule } from '../module';
import { installBandNet } from './bandNet';
import { installBandMusic } from './music';

export default defineModule({
  id: 'band',
  install() {
    installBandNet();
    installBandMusic();
  },
});
