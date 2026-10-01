import { defineWindow } from '@/controllers/interface/windows';
import { GuildWindow, GuildMasterDialog, GuildCreationDialog, GuildKickPasswordDialog } from '.';

export default [
  defineWindow({ id: 'guild', slot: 'hud', order: 270, component: GuildWindow }),
  defineWindow({ id: 'guild_master_dialog', slot: 'hud', order: 370, component: GuildMasterDialog }),
  defineWindow({ id: 'guild_creation_dialog', slot: 'hud', order: 380, component: GuildCreationDialog }),
  defineWindow({ id: 'guild_kick_password_dialog', slot: 'hud', order: 390, component: GuildKickPasswordDialog }),
];
