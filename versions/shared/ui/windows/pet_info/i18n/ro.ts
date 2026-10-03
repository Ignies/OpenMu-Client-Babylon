/** Romanian text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Însoțitor',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} nu este echipat.',
  'petInfo.waiting': 'Se așteaptă datele însoțitorului...',
  'petInfo.level': 'Nivel {level}',
  'petInfo.life': 'Viață {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Daună {min}~{max} (Rată {rate})',
  'petInfo.attackSpeed': 'Viteză de atac {speed}',
  'petInfo.defense': 'Apărare {defense}',
  'petInfo.command': 'Comandă',
  'petInfo.cmdNormal': 'Atac normal',
  'petInfo.cmdRandom': 'Atac aleatoriu',
  'petInfo.cmdOwner': 'Atacă odată cu stăpânul',
  'petInfo.cmdTarget': 'Atacă ținta',
} satisfies Partial<Record<keyof typeof en, string>>;
