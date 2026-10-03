/** Polish text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Zwierzak',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} - nie założono.',
  'petInfo.waiting': 'Oczekiwanie na informacje o zwierzaku...',
  'petInfo.level': 'Poziom {level}',
  'petInfo.life': 'Życie {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Obrażenia {min}~{max} (Celność {rate})',
  'petInfo.attackSpeed': 'Szybkość ataku {speed}',
  'petInfo.defense': 'Obrona {defense}',
  'petInfo.command': 'Rozkaz',
  'petInfo.cmdNormal': 'Zwykły atak',
  'petInfo.cmdRandom': 'Losowy atak',
  'petInfo.cmdOwner': 'Atak z właścicielem',
  'petInfo.cmdTarget': 'Atakuj cel',
  'petInfo.close': 'Zamknij',
} satisfies Partial<Record<keyof typeof en, string>>;
