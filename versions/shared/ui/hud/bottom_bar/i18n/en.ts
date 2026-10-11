/** English text of the `bottom_bar` HUD element. See src/i18n/readme.md. */

const en = {
  'bottomBar.itemShop': 'Item Shop',
  'bottomBar.characterInfo': 'Character Information',
  'bottomBar.inventory': 'Inventory',
  'bottomBar.friendList': 'Friend List',
  'bottomBar.menu': 'Menu',
  'bottomBar.noSkill': 'No skill (right click = attack)',
  'bottomBar.emptySlot': '[{key}] empty',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - click: skill list, right click: plain attack',
  'bottomBar.pickSkill': '[{key}] empty - click to choose a skill',
  'bottomBar.boundSlot': '{name} [{key}] - right click to change',
  'bottomBar.clearSlot': 'Leave slot [{key}] empty',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Rnd',
  'bottomBar.pet.owner': 'Own',
  'bottomBar.pet.target': 'Tgt',
  'bottomBar.pet.needTarget': 'Select a target for the raven first',

  'exp.title': 'Experience',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/hud/bottom_bar': typeof en;
  }
}
