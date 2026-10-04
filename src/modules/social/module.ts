import { defineModule } from '../module';

// The chat log, party and guild state (`Social`) every module writes to; its packets are the chat,
// party, guild and guild_war nets. Nothing to install.
export default defineModule({
  id: 'social',
  core: true,
  install() {},
});
