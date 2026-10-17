/** eu text of `versions/shared/ui/hud/bottom_bar`. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'Objektu-denda',
  'bottomBar.characterInfo': 'Pertsonaiaren informazioa',
  'bottomBar.inventory': 'Inbentarioa',
  'bottomBar.friendList': 'Lagun-zerrenda',
  'bottomBar.noSkill': 'Trebetasunik ez (eskuineko klik = erasoa)',
  'bottomBar.emptySlot': '[{key}] hutsik',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - klik: trebetasun-zerrenda, eskuineko klik: eraso arrunta',
  'bottomBar.pickSkill': '[{key}] hutsik: egin klik trebetasun bat aukeratzeko',
  'bottomBar.boundSlot': '{name} [{key}]: eskuineko klik aldatzeko',
  'bottomBar.clearSlot': 'Utzi [{key}] tartea hutsik',
  'bottomBar.pet.normal': 'Arr',
  'bottomBar.pet.random': 'Aus',
  'bottomBar.pet.owner': 'Jab',
  'bottomBar.pet.target': 'Hel',
  'bottomBar.pet.needTarget': 'Aukeratu lehenik helburu bat belearentzat',
  'exp.title': 'Esperientzia',
  'bottomBar.menu': 'Menua',
} satisfies Partial<Record<keyof typeof en, string>>;
