/** German text of the `npc_shop` module. */

import type en from './en';

export default {
  'notify.npcNothingYet': 'Dieser NPC hat noch nichts für dich',
} satisfies Partial<Record<keyof typeof en, string>>;
