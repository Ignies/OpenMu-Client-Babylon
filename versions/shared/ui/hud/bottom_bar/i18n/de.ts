/** German text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Item-Shop',
  'bottomBar.characterInfo': 'Charakterinformationen',
  'bottomBar.inventory': 'Inventar',
  'bottomBar.friendList': 'Freundesliste',
  'bottomBar.options': 'Optionen',
  'bottomBar.noSkill': 'Keine Fertigkeit (Rechtsklick = Angriff)',
  'bottomBar.emptySlot': '[{key}] leer',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint':
    ' - Klick: Fertigkeitenliste, Rechtsklick: normaler Angriff',
  'bottomBar.pickSkill': '[{key}] leer - klicken, um eine Fertigkeit zu wählen',
  'bottomBar.boundSlot': '{name} [{key}] - Rechtsklick zum Ändern',
  'bottomBar.clearSlot': 'Platz [{key}] leer lassen',
  'bottomBar.pet.normal': 'Nor',
  'bottomBar.pet.random': 'Zuf',
  'bottomBar.pet.owner': 'Herr',
  'bottomBar.pet.target': 'Ziel',
  'bottomBar.pet.needTarget': 'Wähle zuerst ein Ziel für den Raben',
  'exp.title': 'Erfahrung',
} satisfies Partial<Record<keyof typeof en, string>>;
