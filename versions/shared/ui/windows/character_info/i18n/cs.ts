/** cs text of `versions/shared/ui/windows/character_info`. */

import type en from './en';

export default {
  'stat.short.strength': 'SÍL',
  'stat.short.agility': 'OBR',
  'stat.short.vitality': 'VIT',
  'stat.short.energy': 'ENE',
  'charInfo.dmgRate': 'Poškození (úsp.): {min}~{max} ({rate})',
  'charInfo.dmg': 'Poškození: {min}~{max}',
  'charInfo.attackRate': 'Úspěšnost útoku: {value}',
  'charInfo.defenseRateFull': 'Obrana (úsp.): {defense} ({rate} +{bonus})',
  'charInfo.defenseRate': 'Obrana (úsp.): {defense} ({rate})',
  'charInfo.defenseFull': 'Obrana: {defense} (+{bonus})',
  'charInfo.defense': 'Obrana: {defense}',
  'charInfo.defenseRatePvp': 'Úspěšnost obrany: {value}',
  'charInfo.hp': 'HP: {current} / {max}',
  'charInfo.meleeDamage': 'Poškození zblízka: {value}%',
  'charInfo.mana': 'Mana: {current} / {max}',
  'charInfo.wizardryRate': 'Mag. poškození: {min}~{max} (+{rate})',
  'charInfo.wizardry': 'Mag. poškození: {min}~{max}',
  'charInfo.curseSpell': 'Poškození kletbou: {min} ~ {max}',
  'charInfo.skillDamage': 'Poškození dovedností: {value}%',
  'charInfo.divineDamage': 'Božské poškození (Roar, Slasher): {value}%',
  'charInfo.aoeDamage': 'Plošné poškození (Dark Side): {value}%',
  'charInfo.addAmount': 'Body k přidání',
  'charInfo.stopAdding': 'Zastavit',
  'characterInfo.title': 'Postava',
  'characterInfo.close': 'Zavřít (C)',
  'characterInfo.quest': 'Úkol (T)',
  'characterInfo.pet': 'Mazlíček',
  'characterInfo.masterTree': 'Strom mistrovských dovedností (A)',
} satisfies Partial<Record<keyof typeof en, string>>;
