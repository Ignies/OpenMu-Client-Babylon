/** French text of the `npc_shop` module. */

import type en from './en';

export default {
  'notify.npcNothingYet': 'Ce PNJ n’a encore rien pour vous',
} satisfies Partial<Record<keyof typeof en, string>>;
