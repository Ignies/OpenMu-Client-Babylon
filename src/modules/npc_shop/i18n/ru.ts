/** Russian text of the `npc_shop` module. */

import type en from './en';

export default {
  'notify.npcNothingYet': 'У этого NPC для вас пока ничего нет',
} satisfies Partial<Record<keyof typeof en, string>>;
