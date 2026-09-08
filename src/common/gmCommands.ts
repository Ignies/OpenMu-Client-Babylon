/**
 * The game master command catalogue, as data.
 *
 * Every entry is a command OpenMU already implements in
 * `GameLogic/PlugIns/ChatCommands`. The panel builds a `/line` from an entry
 * and sends it as ordinary chat, exactly as if it had been typed - there is no
 * other way to run one, and no way for the panel to run something the server
 * would refuse from the chat box.
 *
 * Parameter order and required flags are the ones the server's argument
 * classes declare, because it parses positionally when no `name=value` pair is
 * present (`CommandExtensions.TryParseArgumentsAsync`). The `set*` commands
 * take the **value first and the character second**, which is the opposite of
 * what their name suggests.
 *
 * All of these need `CharacterStatus.GameMaster` except `/openware`, `/npc`
 * and `/clearinv`, which any player may run but which do more for a game
 * master: the warehouse opens anywhere, any NPC store opens by id, and the
 * inventory cleared can be someone else's, for free.
 *
 * The shape mirrors the server's own `AvailableChatCommand` message (command,
 * name, description, and per-parameter name / type / required / valid values),
 * so once the client declares itself as OpenMU 106.3 this table can be replaced
 * by the list the server sends for the logged-in character without the panel
 * changing. See `todo/client_version_106_3_migration.md`.
 */

export type GmParamType = 'text' | 'number' | 'boolean';

export type GmParam = {
  /** Matches the property on the server's argument class. */
  name: string;
  /** What to show above the input. */
  label: string;
  type: GmParamType;
  required: boolean;
  /** Offered as a chip row instead of a free input when present. */
  validValues?: readonly string[];
  /** Greyed hint inside an empty input. */
  hint?: string;
  /** Takes the rest of the line, spaces and all. Only ever the last one. */
  rest?: boolean;
};

export type GmCommand = {
  /** With the leading slash, as the server's plugin `Key` spells it. */
  command: string;
  label: string;
  help: string;
  params?: readonly GmParam[];
  /**
   * Takes someone's access or progress away, or speaks to the whole server.
   * The panel asks once before sending, because none of these can be undone
   * by pressing the button again.
   */
  confirm?: boolean;
};

export type GmGroup = {
  id: string;
  title: string;
  commands: readonly GmCommand[];
};

const characterParam = (required: boolean): GmParam => ({
  name: 'characterName',
  label: 'Character',
  type: 'text',
  required,
  hint: required ? 'name' : 'blank = you',
});

const COORDS: readonly GmParam[] = [
  { name: 'x', label: 'X', type: 'number', required: true },
  { name: 'y', label: 'Y', type: 'number', required: true },
];

/** `/set<thing> <value> [character]` - the value comes first, always. */
const setter = (
  command: string,
  label: string,
  help: string,
  valueName: string,
  valueLabel: string
): GmCommand => ({
  command,
  label,
  help,
  params: [
    { name: valueName, label: valueLabel, type: 'number', required: true },
    characterParam(false),
  ],
  confirm: true,
});

const getter = (command: string, label: string, help: string): GmCommand => ({
  command,
  label,
  help,
  params: [characterParam(false)],
});

export const GM_GROUPS: readonly GmGroup[] = [
  {
    id: 'world',
    title: 'World',
    commands: [
      {
        command: '/teleport',
        label: 'Teleport',
        help: 'Move to a coordinate on the map you are standing on.',
        params: COORDS,
      },
      {
        command: '/trace',
        label: 'Go to character',
        help: 'Warp yourself to where a character is standing.',
        params: [characterParam(true)],
      },
      {
        command: '/track',
        label: 'Bring character here',
        help: 'Warp a character to where you are standing.',
        params: [characterParam(true)],
        confirm: true,
      },
      { command: '/hide', label: 'Become invisible', help: 'Drop out of every other player’s scope.' },
      { command: '/unhide', label: 'Become visible', help: 'Come back into scope.' },
      {
        command: '/skin',
        label: 'Wear monster skin',
        help: 'Appear as a monster, by its number.',
        params: [{ name: 'skin', label: 'Monster', type: 'number', required: true }],
      },
      {
        command: '/createmonster',
        label: 'Spawn monster',
        help: 'Spawn a monster where you stand. Intelligence 1 makes it move and fight.',
        params: [
          { name: 'number', label: 'Monster', type: 'number', required: true },
          {
            name: 'intelligence',
            label: 'Intelligence',
            type: 'boolean',
            required: false,
            validValues: ['0', '1'],
          },
        ],
      },
      {
        command: '/movemonster',
        label: 'Place monster',
        help: 'Put a monster you can see at a coordinate.',
        params: [{ name: 'id', label: 'Monster id', type: 'number', required: true }, ...COORDS],
      },
      {
        command: '/walkmonster',
        label: 'Walk monster',
        help: 'Walk a monster you can see to a coordinate instead of putting it there.',
        params: [{ name: 'id', label: 'Monster id', type: 'number', required: true }, ...COORDS],
      },
      {
        command: '/removenpc',
        label: 'Remove NPC',
        help: 'Remove an NPC or monster you can see, by its id.',
        params: [{ name: 'id', label: 'NPC id', type: 'number', required: true }],
        confirm: true,
      },
      { command: '/showids', label: 'Show NPC ids', help: 'Print the ids of the NPCs around you.' },
      { command: '/openware', label: 'Open warehouse', help: 'Open your vault without standing at the NPC.' },
      {
        command: '/npc',
        label: 'Open NPC store',
        help: 'Open any NPC’s store by its id.',
        params: [{ name: 'npcId', label: 'NPC id', type: 'number', required: false }],
      },
    ],
  },
  {
    id: 'players',
    title: 'Players',
    commands: [
      { command: '/online', label: 'Who is online', help: 'Print how many players are online.' },
      {
        command: '/charinfo',
        label: 'Character info',
        help: 'Print a character’s level, stats and money.',
        params: [characterParam(true)],
      },
      getter('/getlevel', 'Read level', 'Print a character’s level.'),
      setter('/setlevel', 'Set level', 'Set a character’s level.', 'level', 'Level'),
      getter('/getmoney', 'Read zen', 'Print how much zen a character carries.'),
      setter('/setmoney', 'Set zen', 'Set how much zen a character carries.', 'amount', 'Zen'),
      getter('/getresets', 'Read resets', 'Print a character’s reset count.'),
      setter('/setresets', 'Set resets', 'Set a character’s reset count.', 'resets', 'Resets'),
      getter('/getleveluppoints', 'Read points', 'Print a character’s unspent level-up points.'),
      setter(
        '/setleveluppoints',
        'Set points',
        'Set a character’s unspent level-up points.',
        'levelUpPoints',
        'Points'
      ),
      getter('/getmasterlevel', 'Read master level', 'Print a character’s master level.'),
      setter(
        '/setmasterlevel',
        'Set master level',
        'Set a character’s master level.',
        'masterLevel',
        'Level'
      ),
      getter(
        '/getmasterleveluppoints',
        'Read master points',
        'Print a character’s unspent master level-up points.'
      ),
      setter(
        '/setmasterleveluppoints',
        'Set master points',
        'Set a character’s unspent master level-up points.',
        'masterLevelUpPoints',
        'Points'
      ),
      {
        command: '/get',
        label: 'Read stat',
        help: 'Print one stat of a character.',
        params: [
          {
            name: 'statType',
            label: 'Stat',
            type: 'text',
            required: true,
            validValues: ['str', 'agi', 'vit', 'ene', 'cmd'],
          },
          characterParam(false),
        ],
      },
      {
        command: '/set',
        label: 'Set stat',
        help: 'Set one stat of a character.',
        params: [
          {
            name: 'statType',
            label: 'Stat',
            type: 'text',
            required: true,
            validValues: ['str', 'agi', 'vit', 'ene', 'cmd'],
          },
          { name: 'amount', label: 'Value', type: 'number', required: true },
          characterParam(false),
        ],
        confirm: true,
      },
      {
        command: '/pk',
        label: 'Set PK state',
        help: 'Set a character’s murderer level and kill count.',
        params: [
          characterParam(true),
          { name: 'pkLevel', label: 'PK level', type: 'number', required: true },
          { name: 'pkCount', label: 'PK count', type: 'number', required: true },
        ],
        confirm: true,
      },
      {
        command: '/item',
        label: 'Drop item',
        help: 'Drop an item at your feet. Group and number identify it; everything after is optional, and a blank one ends the line.',
        params: [
          { name: 'group', label: 'Group', type: 'number', required: true },
          { name: 'number', label: 'Number', type: 'number', required: true },
          { name: 'lvl', label: 'Level', type: 'number', required: false },
          { name: 'ex', label: 'Excellent', type: 'number', required: false },
          { name: 'sk', label: 'Skill', type: 'boolean', required: false, validValues: ['0', '1'] },
          { name: 'lu', label: 'Luck', type: 'boolean', required: false, validValues: ['0', '1'] },
          { name: 'opt', label: 'Option', type: 'number', required: false },
          { name: 'anc', label: 'Ancient', type: 'number', required: false },
          { name: 'ancBonuslvl', label: 'Ancient bonus', type: 'number', required: false },
        ],
      },
      {
        command: '/clearinv',
        label: 'Clear inventory',
        help: 'Empty an inventory. Blank clears your own; a name clears that character’s, for free and without asking them.',
        params: [characterParam(false)],
        confirm: true,
      },
      {
        command: '/disconnect',
        label: 'Disconnect character',
        help: 'Close a character’s connection. They can log straight back in.',
        params: [characterParam(true)],
        confirm: true,
      },
    ],
  },
  {
    id: 'moderation',
    title: 'Moderation',
    commands: [
      {
        command: '/banacc',
        label: 'Ban account',
        help: 'Lock an account by its login name. Everyone on it is disconnected.',
        params: [{ name: 'acc', label: 'Account', type: 'text', required: true, hint: 'login name' }],
        confirm: true,
      },
      {
        command: '/unbanacc',
        label: 'Unban account',
        help: 'Unlock an account by its login name.',
        params: [{ name: 'acc', label: 'Account', type: 'text', required: true, hint: 'login name' }],
        confirm: true,
      },
      {
        command: '/banchar',
        label: 'Ban character',
        help: 'Lock the account behind a character name.',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/unbanchar',
        label: 'Unban character',
        help: 'Unlock the account behind a character name.',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/chatban',
        label: 'Mute character',
        help: 'Stop a character from talking, for a number of minutes.',
        params: [
          characterParam(true),
          { name: 'durationMinutes', label: 'Minutes', type: 'number', required: true },
        ],
        confirm: true,
      },
      {
        command: '/chatunban',
        label: 'Unmute character',
        help: 'Let a muted character talk again.',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/guilddisconnect',
        label: 'Disconnect guild',
        help: 'Close the connection of every online member of a guild.',
        params: [{ name: 'guild', label: 'Guild', type: 'text', required: true }],
        confirm: true,
      },
      {
        command: '/guildmove',
        label: 'Warp guild',
        help: 'Warp every online member of a guild to a map.',
        params: [
          { name: 'guild', label: 'Guild', type: 'text', required: true },
          { name: 'mapIdOrName', label: 'Map', type: 'text', required: true, hint: 'name or id' },
          { name: 'x', label: 'X', type: 'number', required: false },
          { name: 'y', label: 'Y', type: 'number', required: false },
        ],
        confirm: true,
      },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    commands: [
      { command: '/startbc', label: 'Start Blood Castle', help: 'Start the Blood Castle event now.' },
      { command: '/startcc', label: 'Start Chaos Castle', help: 'Start the Chaos Castle event now.' },
      { command: '/startds', label: 'Start Devil Square', help: 'Start the Devil Square event now.' },
      {
        command: '/fireworks',
        label: 'Fireworks',
        help: 'Set off fireworks at a coordinate on this map.',
        params: COORDS,
      },
      {
        command: '/xmasfireworks',
        label: 'Christmas fireworks',
        help: 'Set off the Christmas fireworks at a coordinate on this map.',
        params: COORDS,
      },
      {
        command: '/goldnotice',
        label: 'Golden notice',
        help: 'Show a golden banner to everyone on the server.',
        params: [
          {
            name: 'message',
            label: 'Message',
            type: 'text',
            required: true,
            hint: 'what to say',
            rest: true,
          },
        ],
        confirm: true,
      },
    ],
  },
];

/** Every command in the catalogue, flat - the search box reads this. */
export const GM_COMMANDS: readonly GmCommand[] = GM_GROUPS.flatMap(g => g.commands);

export type BuiltCommand = { line: string } | { error: string };

/**
 * Build the line to send, or say why it cannot be built.
 *
 * A blank optional parameter ends the line: the server parses positionally, so
 * anything after a gap would land in the wrong slot. That is why `/item` stops
 * at the first blank rather than skipping it.
 */
export function buildCommandLine(
  command: GmCommand,
  values: Readonly<Record<string, string>>
): BuiltCommand {
  const parts: string[] = [command.command];

  for (const param of command.params ?? []) {
    const raw = (values[param.name] ?? '').trim();

    if (!raw) {
      if (param.required) return { error: `${param.label} is required.` };
      break;
    }

    if (param.type === 'number' && !/^-?\d+$/.test(raw)) {
      return { error: `${param.label} must be a whole number.` };
    }

    if (param.validValues && !param.validValues.includes(raw)) {
      return { error: `${param.label} must be one of ${param.validValues.join(', ')}.` };
    }

    if (!param.rest && /\s/.test(raw)) {
      return { error: `${param.label} cannot contain spaces.` };
    }

    parts.push(raw);
  }

  return { line: parts.join(' ') };
}

/**
 * Commands matching what was typed into the panel's filter box, across every
 * group - `/setmoney` is only in Players if you already knew that, so the box
 * searches the slash name, the label and the help alike.
 */
export function matchGmCommands(query: string): readonly GmCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return GM_COMMANDS;

  return GM_COMMANDS.filter(
    command =>
      command.command.includes(needle) ||
      command.label.toLowerCase().includes(needle) ||
      command.help.toLowerCase().includes(needle)
  );
}
