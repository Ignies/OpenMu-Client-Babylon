/** English text of the `npc_shop` module. See src/i18n/readme.md. */

const en = {
  'notify.npcNothingYet': 'This NPC has nothing for you yet',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/npc_shop': typeof en;
  }
}
