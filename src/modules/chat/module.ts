import { defineModule } from '../module';
import { installNet } from './net';
import { Commands } from './commands';
import { setLocalCommands } from '../social/social';

export default defineModule({
  id: 'chat',
  core: true,
  install() {
    setLocalCommands(Commands);
    installNet();
  },
});
