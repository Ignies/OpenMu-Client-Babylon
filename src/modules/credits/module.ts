import { defineModule } from '../module';

/** No packets: the credits are read from GitHub when a page or window asks (`contributors.ts`). */
export default defineModule({
  id: 'credits',
  core: true,
  install: () => {},
});
