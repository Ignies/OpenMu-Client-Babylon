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
 * Everything a person reads is a `TextKey`, resolved where it is drawn - the
 * table is module scope, and a `t()` here would freeze at whatever language
 * was current when the module first loaded. The slash names themselves are the
 * server's and are never translated.
 *
 * The shape mirrors the server's own `AvailableChatCommand` message (command,
 * name, description, and per-parameter name / type / required / valid values),
 * so once the client declares itself as OpenMU 106.3 this table can be replaced
 * by the list the server sends for the logged-in character without the panel
 * changing. See `todo/client_version_106_3_migration.md`.
 */

import { t, type TextKey } from '../i18n';

export type GmParamType = 'text' | 'number' | 'boolean';

export type GmParam = {
  /** Matches the property on the server's argument class. */
  name: string;
  /** What to show above the input. */
  labelKey: TextKey;
  type: GmParamType;
  required: boolean;
  /** Offered as a chip row instead of a free input when present. */
  validValues?: readonly string[];
  /** Greyed hint inside an empty input. */
  hintKey?: TextKey;
  /** Takes the rest of the line, spaces and all. Only ever the last one. */
  rest?: boolean;
};

export type GmCommand = {
  /** With the leading slash, as the server's plugin `Key` spells it. */
  command: string;
  labelKey: TextKey;
  helpKey: TextKey;
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
  titleKey: TextKey;
  commands: readonly GmCommand[];
};

const characterParam = (required: boolean): GmParam => ({
  name: 'characterName',
  labelKey: 'gm.param.character',
  type: 'text',
  required,
  hintKey: required ? 'gm.hint.name' : 'gm.hint.blankIsYou',
});

const COORDS: readonly GmParam[] = [
  { name: 'x', labelKey: 'gm.param.x', type: 'number', required: true },
  { name: 'y', labelKey: 'gm.param.y', type: 'number', required: true },
];

/** `/set<thing> <value> [character]` - the value comes first, always. */
const setter = (
  command: string,
  labelKey: TextKey,
  helpKey: TextKey,
  valueName: string,
  valueLabelKey: TextKey
): GmCommand => ({
  command,
  labelKey,
  helpKey,
  params: [
    { name: valueName, labelKey: valueLabelKey, type: 'number', required: true },
    characterParam(false),
  ],
  confirm: true,
});

const getter = (command: string, labelKey: TextKey, helpKey: TextKey): GmCommand => ({
  command,
  labelKey,
  helpKey,
  params: [characterParam(false)],
});

export const GM_GROUPS: readonly GmGroup[] = [
  {
    id: 'world',
    titleKey: 'gm.group.world',
    commands: [
      {
        command: '/teleport',
        labelKey: 'gm.cmd.teleport.label',
        helpKey: 'gm.cmd.teleport.help',
        params: COORDS,
      },
      {
        // Gated at Normal, but it does more for a game master: with a map in
        // the second slot it warps *another* character, and with coordinates
        // it reaches any map at all. Without them it goes through the server's
        // warp list, which only covers the maps that have a warp gate.
        command: '/move',
        labelKey: 'gm.cmd.move.label',
        helpKey: 'gm.cmd.move.help',
        params: [
          {
            name: 'target',
            labelKey: 'gm.param.character',
            type: 'text',
            required: true,
            hintKey: 'gm.hint.whoToWarp',
          },
          {
            name: 'mapIdOrName',
            labelKey: 'gm.param.map',
            type: 'text',
            required: false,
            hintKey: 'gm.hint.numberOrName',
          },
          { name: 'x', labelKey: 'gm.param.x', type: 'number', required: false },
          { name: 'y', labelKey: 'gm.param.y', type: 'number', required: false },
        ],
      },
      {
        command: '/trace',
        labelKey: 'gm.cmd.trace.label',
        helpKey: 'gm.cmd.trace.help',
        params: [characterParam(true)],
      },
      {
        command: '/track',
        labelKey: 'gm.cmd.track.label',
        helpKey: 'gm.cmd.track.help',
        params: [characterParam(true)],
        confirm: true,
      },
      { command: '/hide', labelKey: 'gm.cmd.hide.label', helpKey: 'gm.cmd.hide.help' },
      { command: '/unhide', labelKey: 'gm.cmd.unhide.label', helpKey: 'gm.cmd.unhide.help' },
      {
        command: '/skin',
        labelKey: 'gm.cmd.skin.label',
        helpKey: 'gm.cmd.skin.help',
        params: [{ name: 'skin', labelKey: 'gm.param.monster', type: 'number', required: true }],
      },
      {
        command: '/createmonster',
        labelKey: 'gm.cmd.createmonster.label',
        helpKey: 'gm.cmd.createmonster.help',
        params: [
          { name: 'number', labelKey: 'gm.param.monster', type: 'number', required: true },
          {
            name: 'intelligence',
            labelKey: 'gm.param.intelligence',
            type: 'boolean',
            required: false,
            validValues: ['0', '1'],
          },
        ],
      },
      {
        command: '/movemonster',
        labelKey: 'gm.cmd.movemonster.label',
        helpKey: 'gm.cmd.movemonster.help',
        params: [
          { name: 'id', labelKey: 'gm.param.monsterId', type: 'number', required: true },
          ...COORDS,
        ],
      },
      {
        command: '/walkmonster',
        labelKey: 'gm.cmd.walkmonster.label',
        helpKey: 'gm.cmd.walkmonster.help',
        params: [
          { name: 'id', labelKey: 'gm.param.monsterId', type: 'number', required: true },
          ...COORDS,
        ],
      },
      {
        command: '/removenpc',
        labelKey: 'gm.cmd.removenpc.label',
        helpKey: 'gm.cmd.removenpc.help',
        params: [{ name: 'id', labelKey: 'gm.param.npcId', type: 'number', required: true }],
        confirm: true,
      },
      {
        command: '/showids',
        labelKey: 'gm.cmd.showids.label',
        helpKey: 'gm.cmd.showids.help',
      },
      {
        command: '/openware',
        labelKey: 'gm.cmd.openware.label',
        helpKey: 'gm.cmd.openware.help',
      },
      {
        command: '/npc',
        labelKey: 'gm.cmd.npc.label',
        helpKey: 'gm.cmd.npc.help',
        params: [{ name: 'npcId', labelKey: 'gm.param.npcId', type: 'number', required: false }],
      },
    ],
  },
  {
    id: 'players',
    titleKey: 'gm.group.players',
    commands: [
      {
        command: '/online',
        labelKey: 'gm.cmd.online.label',
        helpKey: 'gm.cmd.online.help',
      },
      {
        command: '/charinfo',
        labelKey: 'gm.cmd.charinfo.label',
        helpKey: 'gm.cmd.charinfo.help',
        params: [characterParam(true)],
      },
      getter('/getlevel', 'gm.cmd.getlevel.label', 'gm.cmd.getlevel.help'),
      setter('/setlevel', 'gm.cmd.setlevel.label', 'gm.cmd.setlevel.help', 'level', 'gm.param.level'),
      getter('/getmoney', 'gm.cmd.getmoney.label', 'gm.cmd.getmoney.help'),
      setter('/setmoney', 'gm.cmd.setmoney.label', 'gm.cmd.setmoney.help', 'amount', 'common.zen'),
      getter('/getresets', 'gm.cmd.getresets.label', 'gm.cmd.getresets.help'),
      setter('/setresets', 'gm.cmd.setresets.label', 'gm.cmd.setresets.help', 'resets', 'gm.param.resets'),
      getter('/getleveluppoints', 'gm.cmd.getleveluppoints.label', 'gm.cmd.getleveluppoints.help'),
      setter(
        '/setleveluppoints',
        'gm.cmd.setleveluppoints.label',
        'gm.cmd.setleveluppoints.help',
        'levelUpPoints',
        'gm.param.points'
      ),
      getter('/getmasterlevel', 'gm.cmd.getmasterlevel.label', 'gm.cmd.getmasterlevel.help'),
      setter(
        '/setmasterlevel',
        'gm.cmd.setmasterlevel.label',
        'gm.cmd.setmasterlevel.help',
        'masterLevel',
        'gm.param.level'
      ),
      getter(
        '/getmasterleveluppoints',
        'gm.cmd.getmasterleveluppoints.label',
        'gm.cmd.getmasterleveluppoints.help'
      ),
      setter(
        '/setmasterleveluppoints',
        'gm.cmd.setmasterleveluppoints.label',
        'gm.cmd.setmasterleveluppoints.help',
        'masterLevelUpPoints',
        'gm.param.points'
      ),
      {
        command: '/get',
        labelKey: 'gm.cmd.get.label',
        helpKey: 'gm.cmd.get.help',
        params: [
          {
            name: 'statType',
            labelKey: 'gm.param.stat',
            type: 'text',
            required: true,
            validValues: ['str', 'agi', 'vit', 'ene', 'cmd'],
          },
          characterParam(false),
        ],
      },
      {
        command: '/set',
        labelKey: 'gm.cmd.set.label',
        helpKey: 'gm.cmd.set.help',
        params: [
          {
            name: 'statType',
            labelKey: 'gm.param.stat',
            type: 'text',
            required: true,
            validValues: ['str', 'agi', 'vit', 'ene', 'cmd'],
          },
          { name: 'amount', labelKey: 'gm.param.value', type: 'number', required: true },
          characterParam(false),
        ],
        confirm: true,
      },
      {
        command: '/pk',
        labelKey: 'gm.cmd.pk.label',
        helpKey: 'gm.cmd.pk.help',
        params: [
          characterParam(true),
          { name: 'pkLevel', labelKey: 'gm.param.pkLevel', type: 'number', required: true },
          { name: 'pkCount', labelKey: 'gm.param.pkCount', type: 'number', required: true },
        ],
        confirm: true,
      },
      {
        command: '/item',
        labelKey: 'gm.cmd.item.label',
        helpKey: 'gm.cmd.item.help',
        params: [
          { name: 'group', labelKey: 'gm.param.group', type: 'number', required: true },
          { name: 'number', labelKey: 'gm.param.number', type: 'number', required: true },
          { name: 'lvl', labelKey: 'gm.param.level', type: 'number', required: false },
          { name: 'ex', labelKey: 'gm.param.excellent', type: 'number', required: false },
          {
            name: 'sk',
            labelKey: 'gm.param.skill',
            type: 'boolean',
            required: false,
            validValues: ['0', '1'],
          },
          {
            name: 'lu',
            labelKey: 'gm.param.luck',
            type: 'boolean',
            required: false,
            validValues: ['0', '1'],
          },
          { name: 'opt', labelKey: 'gm.param.option', type: 'number', required: false },
          { name: 'anc', labelKey: 'gm.param.ancient', type: 'number', required: false },
          {
            name: 'ancBonuslvl',
            labelKey: 'gm.param.ancientBonus',
            type: 'number',
            required: false,
          },
        ],
      },
      {
        command: '/clearinv',
        labelKey: 'gm.cmd.clearinv.label',
        helpKey: 'gm.cmd.clearinv.help',
        params: [characterParam(false)],
        confirm: true,
      },
      {
        command: '/disconnect',
        labelKey: 'gm.cmd.disconnect.label',
        helpKey: 'gm.cmd.disconnect.help',
        params: [characterParam(true)],
        confirm: true,
      },
    ],
  },
  {
    id: 'moderation',
    titleKey: 'gm.group.moderation',
    commands: [
      {
        command: '/banacc',
        labelKey: 'gm.cmd.banacc.label',
        helpKey: 'gm.cmd.banacc.help',
        params: [
          {
            name: 'acc',
            labelKey: 'gm.param.account',
            type: 'text',
            required: true,
            hintKey: 'gm.hint.loginName',
          },
        ],
        confirm: true,
      },
      {
        command: '/unbanacc',
        labelKey: 'gm.cmd.unbanacc.label',
        helpKey: 'gm.cmd.unbanacc.help',
        params: [
          {
            name: 'acc',
            labelKey: 'gm.param.account',
            type: 'text',
            required: true,
            hintKey: 'gm.hint.loginName',
          },
        ],
        confirm: true,
      },
      {
        command: '/banchar',
        labelKey: 'gm.cmd.banchar.label',
        helpKey: 'gm.cmd.banchar.help',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/unbanchar',
        labelKey: 'gm.cmd.unbanchar.label',
        helpKey: 'gm.cmd.unbanchar.help',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/chatban',
        labelKey: 'gm.cmd.chatban.label',
        helpKey: 'gm.cmd.chatban.help',
        params: [
          characterParam(true),
          {
            name: 'durationMinutes',
            labelKey: 'gm.param.minutes',
            type: 'number',
            required: true,
          },
        ],
        confirm: true,
      },
      {
        command: '/chatunban',
        labelKey: 'gm.cmd.chatunban.label',
        helpKey: 'gm.cmd.chatunban.help',
        params: [characterParam(true)],
        confirm: true,
      },
      {
        command: '/guilddisconnect',
        labelKey: 'gm.cmd.guilddisconnect.label',
        helpKey: 'gm.cmd.guilddisconnect.help',
        params: [{ name: 'guild', labelKey: 'gm.param.guild', type: 'text', required: true }],
        confirm: true,
      },
      {
        command: '/guildmove',
        labelKey: 'gm.cmd.guildmove.label',
        helpKey: 'gm.cmd.guildmove.help',
        params: [
          { name: 'guild', labelKey: 'gm.param.guild', type: 'text', required: true },
          {
            name: 'mapIdOrName',
            labelKey: 'gm.param.map',
            type: 'text',
            required: true,
            hintKey: 'gm.hint.nameOrId',
          },
          { name: 'x', labelKey: 'gm.param.x', type: 'number', required: false },
          { name: 'y', labelKey: 'gm.param.y', type: 'number', required: false },
        ],
        confirm: true,
      },
    ],
  },
  {
    id: 'events',
    titleKey: 'gm.group.events',
    commands: [
      {
        command: '/startbc',
        labelKey: 'gm.cmd.startbc.label',
        helpKey: 'gm.cmd.startbc.help',
      },
      {
        command: '/startcc',
        labelKey: 'gm.cmd.startcc.label',
        helpKey: 'gm.cmd.startcc.help',
      },
      {
        command: '/startds',
        labelKey: 'gm.cmd.startds.label',
        helpKey: 'gm.cmd.startds.help',
      },
      {
        command: '/fireworks',
        labelKey: 'gm.cmd.fireworks.label',
        helpKey: 'gm.cmd.fireworks.help',
        params: COORDS,
      },
      {
        command: '/xmasfireworks',
        labelKey: 'gm.cmd.xmasfireworks.label',
        helpKey: 'gm.cmd.xmasfireworks.help',
        params: COORDS,
      },
      {
        command: '/goldnotice',
        labelKey: 'gm.cmd.goldnotice.label',
        helpKey: 'gm.cmd.goldnotice.help',
        params: [
          {
            name: 'message',
            labelKey: 'gm.param.message',
            type: 'text',
            required: true,
            hintKey: 'gm.hint.whatToSay',
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
    const field = t(param.labelKey);

    if (!raw) {
      if (param.required) return { error: t('gm.error.required', { field }) };
      break;
    }

    if (param.type === 'number' && !/^-?\d+$/.test(raw)) {
      return { error: t('gm.error.wholeNumber', { field }) };
    }

    if (param.validValues && !param.validValues.includes(raw)) {
      return {
        error: t('gm.error.oneOf', { field, values: param.validValues.join(', ') }),
      };
    }

    if (!param.rest && /\s/.test(raw)) {
      return { error: t('gm.error.noSpaces', { field }) };
    }

    parts.push(raw);
  }

  return { line: parts.join(' ') };
}

/**
 * Commands matching what was typed into the panel's filter box, across every
 * group - `/setmoney` is only in Players if you already knew that, so the box
 * searches the slash name, the label and the help alike. The label and help
 * are matched in the language on screen, so a Spanish game master can search
 * in Spanish.
 */
export function matchGmCommands(query: string): readonly GmCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return GM_COMMANDS;

  return GM_COMMANDS.filter(
    command =>
      command.command.includes(needle) ||
      t(command.labelKey).toLowerCase().includes(needle) ||
      t(command.helpKey).toLowerCase().includes(needle)
  );
}

const BY_NAME = new Map(GM_COMMANDS.map(command => [command.command, command]));

/**
 * One command by its slash name.
 *
 * The panel's purpose-built screens (teleport, the character editor, spawning)
 * compose their own layout out of named commands rather than listing a group,
 * and they must not restate the parameters: the order and the required flags
 * here were checked field by field against the server's argument classes, and
 * a second copy would drift from them.
 *
 * Throws rather than returning undefined - a typo names a command that will
 * never exist at runtime either, and a screen silently missing a button is
 * harder to notice than a failure at boot. `gmCommands.test.ts` calls this for
 * every name the panel uses.
 */
export function gmCommand(name: string): GmCommand {
  const command = BY_NAME.get(name);
  if (!command) throw new Error(`unknown game master command: ${name}`);
  return command;
}
