/** hu text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Kísérő',
  'petInfo.darkHorse': 'Sötét paripa',
  'petInfo.darkRaven': 'Sötét holló',
  'petInfo.notEquipped': 'Nincs felszerelve: {pet}.',
  'petInfo.waiting': 'Várakozás a kísérő adataira...',
  'petInfo.level': 'Szint: {level}',
  'petInfo.life': 'Élet: {current} / {max}',
  'petInfo.exp': 'EXP: {current} / {next}',
  'petInfo.damage': 'Sebzés: {min}~{max} (arány: {rate})',
  'petInfo.attackSpeed': 'Támadási sebesség: {speed}',
  'petInfo.defense': 'Védelem: {defense}',
  'petInfo.command': 'Parancs',
  'petInfo.cmdNormal': 'Alaptámadás',
  'petInfo.cmdRandom': 'Véletlen támadás',
  'petInfo.cmdOwner': 'Támadás a gazdával',
  'petInfo.cmdTarget': 'Célpont támadása',
} satisfies Partial<Record<keyof typeof en, string>>;
