/** Chinese text of the `npc_shop` module. */

import type en from './en';

export default {
  'notify.npcNothingYet': '这个 NPC 暂时没有给你的东西',
} satisfies Partial<Record<keyof typeof en, string>>;
