/**
 * The cheat checks OpenMU already runs, keyed by the Serilog message template
 * each one writes.
 *
 * The template is a string literal in OpenMU's source, so it is a stable key:
 * the values change with every event, the template does not. Matching on it
 * rather than on the rendered line means a player called "Probably Hacker"
 * cannot forge an entry, and a template that changes in an OpenMU upgrade
 * shows up as an unclassified event rather than as a silently wrong one.
 *
 * `severity` is a judgement about what the check proves, not about how angry
 * it sounds:
 *
 *   hard  the client cannot do this by accident or by lag. Attacking from a
 *         safe zone, crafting with items that are not there, combining jewels
 *         without the NPC. Worth acting on.
 *   soft  a modified client would do this, but so would a desynchronised one.
 *         Skill animation counters out of sync, a hit arriving too long after
 *         its animation. Worth counting, not worth banning on.
 *
 * Where the account and character names live differs per message, because
 * OpenMU wrote each of these at a different time: some use positional `{0}`
 * (which Serilog names "0"), some use `{Player}` (the whole player object,
 * rendered as "name (account)"), some name the parts. `account` and
 * `character` name the property to read for each.
 */

export type Severity = 'hard' | 'soft';

export type Signal = {
  /** Short stable id, used by the panel and by any filter. */
  id: string;
  /** What a person calls this check. */
  label: string;
  severity: Severity;
  /** Property holding the account login name, when the message carries one. */
  account?: string;
  /** Property holding the character name, when the message carries one. */
  character?: string;
};

/**
 * Template -> signal. Templates copied verbatim from OpenMU
 * (`src/GameLogic/PlayerActions/**`, `src/GameLogic/SkillHitValidator.cs`).
 */
export const SIGNALS: Readonly<Record<string, Signal>> = {
  'Probably Hacker - player {Player} is attacking in stunned state': {
    id: 'attack-stunned',
    label: 'Attacked while stunned',
    severity: 'hard',
    character: 'Player',
  },
  'Probably Hacker - player {Player} is attacking in asleep state': {
    id: 'attack-asleep',
    label: 'Attacked while asleep',
    severity: 'hard',
    character: 'Player',
  },
  'Probably Hacker - player {Player} is attacking from safezone': {
    id: 'attack-safezone',
    label: 'Attacked from a safe zone',
    severity: 'hard',
    character: 'Player',
  },
  'Probably Hacker - player {player} is attacking in stunned state': {
    id: 'skill-stunned',
    label: 'Cast a skill while stunned',
    severity: 'hard',
    character: 'player',
  },
  'Probably Hacker - player {player} is attacking in sleep state': {
    id: 'skill-asleep',
    label: 'Cast a skill while asleep',
    severity: 'hard',
    character: 'player',
  },
  'Probably Hacker - player {player} is attacking from safezone': {
    id: 'skill-safezone',
    label: 'Cast a skill from a safe zone',
    severity: 'hard',
    character: 'player',
  },
  'Cheater Warning: Player tried to repair pet slot, without opened NPC. Character: [{0}], Account: [{1}]':
    {
      id: 'repair-pet-no-npc',
      label: 'Repaired a pet with no NPC open',
      severity: 'hard',
      character: '0',
      account: '1',
    },
  'Cheater Warning: Player tried to repair all items, without opened NPC. Character: [{0}], Account: [{1}]':
    {
      id: 'repair-all-no-npc',
      label: 'Repaired everything with no NPC open',
      severity: 'hard',
      character: '0',
      account: '1',
    },
  'Probably Hacker tried to Combine/Dismantle Jewels without talking to Lahap. Dupe Method. Acc: [{accountName}] Character: [{characterName}]':
    {
      id: 'jewel-dupe',
      label: 'Combined jewels without Lahap (dupe)',
      severity: 'hard',
      account: 'accountName',
      character: 'characterName',
    },
  'Maybe Hacker, Charname in chat packet != charname\t [{0}] <> [{1}]': {
    id: 'chat-name-mismatch',
    label: 'Chat sent under another name',
    severity: 'hard',
    character: '0',
  },
  'LackingMixItems: Suspicious action for player with name: {0}, could be hack attempt. Missing item(s): {1}':
    {
      id: 'craft-missing-items',
      label: 'Crafted without the items',
      severity: 'hard',
      character: '0',
    },
  'TooManyItems: Suspicious action for player with name: {0}, could be hack attempt. ItemCount: {1}, Required: {2}':
    {
      id: 'craft-too-many-items',
      label: 'Crafted with too many items',
      severity: 'hard',
      character: '0',
    },
  'Store Slot too low: {0}, possible hacker': {
    id: 'store-slot-low',
    label: 'Bought from an impossible shop slot',
    severity: 'hard',
  },
  'Suspicious kick request for player with name: {0} (player is not a guild master) to kick {1}, could be hack attempt.':
    {
      id: 'guild-kick-not-master',
      label: 'Guild kick without being the master',
      severity: 'hard',
      character: '0',
    },
  'Suspicious request for player with name: {0} (player is not a guild master), could be hack attempt.':
    {
      id: 'guild-request-not-master',
      label: 'Guild request without being the master',
      severity: 'hard',
      character: '0',
    },
  'Suspicious party kick request of {0}, could be hack attempt.': {
    id: 'party-kick',
    label: 'Party kick without the right',
    severity: 'hard',
    character: '0',
  },
  'Character not found. Hacker maybe tried to delete other players character!': {
    id: 'delete-other-character',
    label: 'Deleted a character that is not theirs',
    severity: 'hard',
  },
  "Possible Hacker - Skill Hit Invalid because the given animation counter wasn't registered as animation.":
    {
      id: 'hit-unregistered-animation',
      label: 'Hit with no matching animation',
      severity: 'soft',
    },
  'Possible Hacker - Skill Hit Invalid because of too high time difference between animation and hit':
    {
      id: 'hit-late',
      label: 'Hit arrived long after its animation',
      severity: 'soft',
    },
  'Possible Hacker - Skill Hit Invalid because of missing previous animation.': {
    id: 'hit-no-animation',
    label: 'Hit with no animation before it',
    severity: 'soft',
  },
};

/**
 * Templates OpenMU builds by interpolation rather than as a Serilog template
 * (`LogWarning($"...")`), so the "template" Serilog records is the finished
 * sentence with the numbers already in it. Matched by prefix instead.
 */
export const SIGNAL_PREFIXES: readonly (readonly [string, Signal])[] = [
  [
    'Animation count out of sync - hacker?',
    { id: 'animation-count-desync', label: 'Animation count out of sync', severity: 'soft' },
  ],
  [
    'Hit count out of sync - hacker?',
    { id: 'hit-count-desync', label: 'Hit count out of sync', severity: 'soft' },
  ],
  [
    'Wrong skill in referenced animation - hacker?',
    { id: 'wrong-skill-animation', label: 'Wrong skill for the animation', severity: 'soft' },
  ],
];

/** The signal a message template stands for, or nothing when it is not one. */
export function signalFor(template: string): Signal | undefined {
  const exact = SIGNALS[template];
  if (exact) return exact;

  return SIGNAL_PREFIXES.find(([prefix]) => template.startsWith(prefix))?.[1];
}
