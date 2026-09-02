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
  help: string;
  /** Runs on this client, on the player under the cursor. */
  local?: CommandKind;
  /** Needs a game master character (OpenMU `CharacterStatus.GameMaster`). */
  gm?: boolean;
};

export const CHAT_COMMANDS: readonly ChatCommand[] = [
  // ---- client (CheckCommand) -----------------------------------------
  { name: '/trade', help: 'Trade with the player under the cursor', local: 'trade' },
  { name: '/party', help: 'Invite the player under the cursor to your party', local: 'party' },
  { name: '/pt', help: 'Same as /party', local: 'party' },
  { name: '/guild', help: 'Ask the guild master under the cursor to join', local: 'guild' },
  { name: '/union', help: 'Offer an alliance to the guild master under the cursor', local: 'guildUnion' },
  { name: '/rival', help: 'Declare hostility to the guild master under the cursor', local: 'rival' },
  { name: '/rivaloff', help: 'Withdraw hostility from the guild master under the cursor', local: 'rivalOff' },
  { name: '/purchase', help: 'Open the personal shop of the player under the cursor', local: 'purchase' },
  { name: '/duelstart', help: 'Challenge the player under the cursor to a duel', local: 'battle' },
  { name: '/duelend', help: 'End the current duel', local: 'battle' },
  { name: '/whisper', help: 'Whisper to the player under the cursor', local: 'whisper' },
  { name: '/addfriend', help: 'Add the player under the cursor to your friend list', local: 'addFriend' },
  { name: '/follow', help: 'Walk after the player under the cursor', local: 'follow' },
  // Handled in social.ts (it drives scenes/dayCycle.ts, which the completion
  // data must not import) - a debug freeze, never sent to the server.
  { name: '/time', usage: '<dawn|noon|dusk|night|0..1|off>', help: 'Freeze or release the time of day (this client only)' },
  // ---- server (OpenMU) ---------------------------------------------------
  { name: '/post', usage: '<message>', help: 'Shout to everyone on the server' },
  { name: '/help', usage: '[command]', help: 'Server help for a command' },
  { name: '/list', help: 'List the server commands' },
  { name: '/add', usage: '<str|agi|vit|ene|cmd> <amount>', help: 'Spend level-up points' },
  { name: '/addstr', usage: '<amount>', help: 'Spend level-up points on strength' },
  { name: '/addagi', usage: '<amount>', help: 'Spend level-up points on agility' },
  { name: '/addvit', usage: '<amount>', help: 'Spend level-up points on vitality' },
  { name: '/addene', usage: '<amount>', help: 'Spend level-up points on energy' },
  { name: '/addcmd', usage: '<amount>', help: 'Spend level-up points on command' },
  { name: '/move', usage: '<map> [x y]', help: 'Warp to a map' },
  { name: '/war', usage: '<guild>', help: 'Request a guild war' },
  { name: '/battlesoccer', usage: '<guild>', help: 'Request a battle soccer match' },
  { name: '/language', usage: '<isoCode>', help: 'Change the server message language' },
  { name: '/offlevel', help: 'Offline levelling' },
  { name: '/pkclear', usage: '[char]', help: 'Clear the PK state' },
  { name: '/openware', help: 'Open the warehouse', gm: true },
  { name: '/npc', usage: '[id]', help: 'Open an NPC store', gm: true },
  { name: '/get', usage: '<stat>', help: 'Read a stat', gm: true },
  { name: '/set', usage: '<stat> <value>', help: 'Set a stat', gm: true },
  { name: '/getlevel', usage: '[char]', help: 'Read a level', gm: true },
  { name: '/setlevel', usage: '<char> <level>', help: 'Set a level', gm: true },
  { name: '/getmoney', usage: '[char]', help: 'Read zen', gm: true },
  { name: '/setmoney', usage: '<char> <amount>', help: 'Set zen', gm: true },
  { name: '/getresets', usage: '[char]', help: 'Read resets', gm: true },
  { name: '/setresets', usage: '<char> <count>', help: 'Set resets', gm: true },
  { name: '/getleveluppoints', usage: '[char]', help: 'Read level-up points', gm: true },
  { name: '/setleveluppoints', usage: '<char> <points>', help: 'Set level-up points', gm: true },
  { name: '/getmasterlevel', usage: '[char]', help: 'Read master level', gm: true },
  { name: '/setmasterlevel', usage: '<char> <level>', help: 'Set master level', gm: true },
  { name: '/getmasterleveluppoints', usage: '[char]', help: 'Read master points', gm: true },
  { name: '/setmasterleveluppoints', usage: '<char> <points>', help: 'Set master points', gm: true },
  { name: '/item', usage: '<group> <number> [lvl ex sk lu opt anc]', help: 'Drop an item', gm: true },
  { name: '/clearinv', help: 'Clear the inventory', gm: true },
  { name: '/skin', usage: '<number>', help: 'Wear a monster skin', gm: true },
  { name: '/charinfo', usage: '<char>', help: 'Show a character', gm: true },
  { name: '/online', help: 'Who is online', gm: true },
  { name: '/trace', usage: '<char>', help: 'Warp to a character', gm: true },
  { name: '/track', usage: '<char>', help: 'Bring a character to you', gm: true },
  { name: '/teleport', usage: '<x> <y>', help: 'Teleport on this map', gm: true },
  { name: '/hide', help: 'Become invisible', gm: true },
  { name: '/unhide', help: 'Become visible', gm: true },
  { name: '/disconnect', usage: '<char>', help: 'Disconnect a character', gm: true },
  { name: '/banacc', usage: '<acc>', help: 'Ban an account', gm: true },
  { name: '/unbanacc', usage: '<acc>', help: 'Unban an account', gm: true },
  { name: '/banchar', usage: '<char>', help: 'Ban a character', gm: true },
  { name: '/unbanchar', usage: '<char>', help: 'Unban a character', gm: true },
  { name: '/chatban', usage: '<char> <minutes>', help: 'Mute a character', gm: true },
  { name: '/chatunban', usage: '<char>', help: 'Unmute a character', gm: true },
  { name: '/pk', usage: '<char> <pk_lvl> <pk_count>', help: 'Set a PK state', gm: true },
  { name: '/guildmove', usage: '<guild> <map> [x y]', help: 'Warp a guild', gm: true },
  { name: '/guilddisconnect', usage: '<guild>', help: 'Disconnect a guild', gm: true },
  { name: '/goldnotice', usage: '<message>', help: 'Golden notice for everyone', gm: true },
  { name: '/fireworks', help: 'Fireworks', gm: true },
  { name: '/xmasfireworks', help: 'Christmas fireworks', gm: true },
  { name: '/createmonster', usage: '<number> [intelligence]', help: 'Spawn a monster', gm: true },
  { name: '/movemonster', usage: '<id> <x> <y>', help: 'Move a monster', gm: true },
  { name: '/walkmonster', usage: '<id> <x> <y>', help: 'Walk a monster', gm: true },
  { name: '/removenpc', usage: '<id>', help: 'Remove an NPC', gm: true },
  { name: '/showids', help: 'Show NPC ids', gm: true },
  { name: '/startbc', help: 'Start Blood Castle', gm: true },
  { name: '/startcc', help: 'Start Chaos Castle', gm: true },
  { name: '/startds', help: 'Start Devil Square', gm: true },
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
