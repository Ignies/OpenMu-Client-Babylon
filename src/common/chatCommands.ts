/**
 * The `/` commands the chat input box knows about, for the completion list
 * that pops over the input while a line starting with `/` is being typed.
 *
 * Two kinds:
 *
 * - **client** commands are the original's `CheckCommand`
 *   (ZzzInterface.cpp:3990-4500): they act on the player under the cursor
 *   and never reach the server. They are the same actions as the command
 *   window (NewUICommandWindow.cpp), so both share `CommandKind`.
 * - **server** commands go through untouched; OpenMU parses them
 *   (`GameLogic/PlugIns/ChatCommands`). `gm` marks the ones that need a game
 *   master character, so an ordinary player is not offered them.
 */

import type { TextKey } from '../i18n';

/** The command window's entries, in the window's order (COMMAND_TRADE..COMMAND_BATTLE). */
export type CommandKind =
  | 'trade'
  | 'purchase'
  | 'party'
  | 'whisper'
  | 'guild'
  | 'guildUnion'
  | 'rival'
  | 'rivalOff'
  | 'addFriend'
  | 'follow'
  | 'battle';

export type ChatCommand = {
  /** With the leading slash, lower case. */
  name: string;
  /** Argument hint shown after the name, e.g. `<x> <y>`. */
  usage?: string;
  /** One line of help. */
  helpKey: TextKey;
  /** Runs on this client, on the player under the cursor. */
  local?: CommandKind;
  /** Needs a game master character (OpenMU `CharacterStatus.GameMaster`). */
  gm?: boolean;
};

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  // ---- client (CheckCommand) -----------------------------------------
  { name: '/trade', helpKey: 'cmd.trade', local: 'trade' },
  { name: '/party', helpKey: 'cmd.party', local: 'party' },
  { name: '/pt', helpKey: 'cmd.pt', local: 'party' },
  { name: '/guild', helpKey: 'cmd.guild', local: 'guild' },
  { name: '/union', helpKey: 'cmd.union', local: 'guildUnion' },
  { name: '/rival', helpKey: 'cmd.rival', local: 'rival' },
  { name: '/rivaloff', helpKey: 'cmd.rivaloff', local: 'rivalOff' },
  { name: '/purchase', helpKey: 'cmd.purchase', local: 'purchase' },
  { name: '/duelstart', helpKey: 'cmd.duelstart', local: 'battle' },
  { name: '/duelend', helpKey: 'cmd.duelend', local: 'battle' },
  { name: '/whisper', helpKey: 'cmd.whisper', local: 'whisper' },
  { name: '/addfriend', helpKey: 'cmd.addfriend', local: 'addFriend' },
  { name: '/follow', helpKey: 'cmd.follow', local: 'follow' },
  // ---- server (OpenMU) ---------------------------------------------------
  { name: '/post', usage: '<message>', helpKey: 'cmd.post' },
  { name: '/help', usage: '[command]', helpKey: 'cmd.help' },
  { name: '/list', helpKey: 'cmd.list' },
  { name: '/add', usage: '<str|agi|vit|ene|cmd> <amount>', helpKey: 'cmd.add' },
  { name: '/addstr', usage: '<amount>', helpKey: 'cmd.addstr' },
  { name: '/addagi', usage: '<amount>', helpKey: 'cmd.addagi' },
  { name: '/addvit', usage: '<amount>', helpKey: 'cmd.addvit' },
  { name: '/addene', usage: '<amount>', helpKey: 'cmd.addene' },
  { name: '/addcmd', usage: '<amount>', helpKey: 'cmd.addcmd' },
  { name: '/move', usage: '<map> [x y]', helpKey: 'cmd.move' },
  { name: '/war', usage: '<guild>', helpKey: 'cmd.war' },
  { name: '/battlesoccer', usage: '<guild>', helpKey: 'cmd.battlesoccer' },
  { name: '/language', usage: '<isoCode>', helpKey: 'cmd.language' },
  { name: '/offlevel', helpKey: 'cmd.offlevel' },
  { name: '/pkclear', usage: '[char]', helpKey: 'cmd.pkclear' },
  { name: '/openware', helpKey: 'cmd.openware', gm: true },
  { name: '/npc', usage: '[id]', helpKey: 'cmd.npc', gm: true },
  { name: '/get', usage: '<stat>', helpKey: 'cmd.get', gm: true },
  { name: '/set', usage: '<stat> <value>', helpKey: 'cmd.set', gm: true },
  { name: '/getlevel', usage: '[char]', helpKey: 'cmd.getlevel', gm: true },
  { name: '/setlevel', usage: '<char> <level>', helpKey: 'cmd.setlevel', gm: true },
  { name: '/getmoney', usage: '[char]', helpKey: 'cmd.getmoney', gm: true },
  { name: '/setmoney', usage: '<char> <amount>', helpKey: 'cmd.setmoney', gm: true },
  { name: '/getresets', usage: '[char]', helpKey: 'cmd.getresets', gm: true },
  { name: '/setresets', usage: '<char> <count>', helpKey: 'cmd.setresets', gm: true },
  { name: '/getleveluppoints', usage: '[char]', helpKey: 'cmd.getleveluppoints', gm: true },
  { name: '/setleveluppoints', usage: '<char> <points>', helpKey: 'cmd.setleveluppoints', gm: true },
  { name: '/getmasterlevel', usage: '[char]', helpKey: 'cmd.getmasterlevel', gm: true },
  { name: '/setmasterlevel', usage: '<char> <level>', helpKey: 'cmd.setmasterlevel', gm: true },
  { name: '/getmasterleveluppoints', usage: '[char]', helpKey: 'cmd.getmasterleveluppoints', gm: true },
  { name: '/setmasterleveluppoints', usage: '<char> <points>', helpKey: 'cmd.setmasterleveluppoints', gm: true },
  { name: '/item', usage: '<group> <number> [lvl ex sk lu opt anc]', helpKey: 'cmd.item', gm: true },
  { name: '/clearinv', helpKey: 'cmd.clearinv', gm: true },
  { name: '/skin', usage: '<number>', helpKey: 'cmd.skin', gm: true },
  { name: '/charinfo', usage: '<char>', helpKey: 'cmd.charinfo', gm: true },
  { name: '/online', helpKey: 'cmd.online', gm: true },
  { name: '/trace', usage: '<char>', helpKey: 'cmd.trace', gm: true },
  { name: '/track', usage: '<char>', helpKey: 'cmd.track', gm: true },
  { name: '/teleport', usage: '<x> <y>', helpKey: 'cmd.teleport', gm: true },
  { name: '/hide', helpKey: 'cmd.hide', gm: true },
  { name: '/unhide', helpKey: 'cmd.unhide', gm: true },
  { name: '/disconnect', usage: '<char>', helpKey: 'cmd.disconnect', gm: true },
  { name: '/banacc', usage: '<acc>', helpKey: 'cmd.banacc', gm: true },
  { name: '/unbanacc', usage: '<acc>', helpKey: 'cmd.unbanacc', gm: true },
  { name: '/banchar', usage: '<char>', helpKey: 'cmd.banchar', gm: true },
  { name: '/unbanchar', usage: '<char>', helpKey: 'cmd.unbanchar', gm: true },
  { name: '/chatban', usage: '<char> <minutes>', helpKey: 'cmd.chatban', gm: true },
  { name: '/chatunban', usage: '<char>', helpKey: 'cmd.chatunban', gm: true },
  { name: '/pk', usage: '<char> <pk_lvl> <pk_count>', helpKey: 'cmd.pk', gm: true },
  { name: '/guildmove', usage: '<guild> <map> [x y]', helpKey: 'cmd.guildmove', gm: true },
  { name: '/guilddisconnect', usage: '<guild>', helpKey: 'cmd.guilddisconnect', gm: true },
  { name: '/goldnotice', usage: '<message>', helpKey: 'cmd.goldnotice', gm: true },
  { name: '/fireworks', helpKey: 'cmd.fireworks', gm: true },
  { name: '/xmasfireworks', helpKey: 'cmd.xmasfireworks', gm: true },
  { name: '/createmonster', usage: '<number> [intelligence]', helpKey: 'cmd.createmonster', gm: true },
  { name: '/movemonster', usage: '<id> <x> <y>', helpKey: 'cmd.movemonster', gm: true },
  { name: '/walkmonster', usage: '<id> <x> <y>', helpKey: 'cmd.walkmonster', gm: true },
  { name: '/removenpc', usage: '<id>', helpKey: 'cmd.removenpc', gm: true },
  { name: '/showids', helpKey: 'cmd.showids', gm: true },
  { name: '/startbc', helpKey: 'cmd.startbc', gm: true },
  { name: '/startcc', helpKey: 'cmd.startcc', gm: true },
  { name: '/startds', helpKey: 'cmd.startds', gm: true },
];

/** The most rows the completion list shows at once. */
export const CHAT_COMPLETION_ROWS = 8;

/**
 * Commands whose name starts with the word being typed (`/`, `/p`, `/po`…).
 * Once a space follows the name only the exact command is kept, so the list
 * turns into a usage hint. GM commands are offered only when asked for.
 */
export function matchChatCommands(text: string, gm: boolean): ChatCommand[] {
  if (!text.startsWith('/')) return [];
  const space = text.indexOf(' ');
  const word = (space < 0 ? text : text.slice(0, space)).toLowerCase();
  return CHAT_COMMANDS.filter(c => {
    if (c.gm && !gm) return false;
    return space < 0 ? c.name.startsWith(word) : c.name === word;
  });
}

/** The client-side command a typed line stands for, if any (`/pt`, `/trade`…). */
export function localCommandOf(text: string): ChatCommand | undefined {
  const word = text.trim().split(' ')[0].toLowerCase();
  return CHAT_COMMANDS.find(c => c.local && c.name === word);
}
