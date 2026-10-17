/** ca text of `versions/shared/ui/windows/pet_info`. */

import type en from './en';

export default {
  'petInfo.title': 'Mascota',
  'petInfo.darkHorse': 'Cavall fosc',
  'petInfo.darkRaven': 'Corb fosc',
  'petInfo.notEquipped': 'La mascota {pet} no està equipada.',
  'petInfo.waiting': 'S\'està esperant la informació de la mascota...',
  'petInfo.level': 'Nivell {level}',
  'petInfo.life': 'Vida {current} / {max}',
  'petInfo.exp': 'EXP {current} / {next}',
  'petInfo.damage': 'Dany {min}~{max} (taxa {rate})',
  'petInfo.attackSpeed': 'Velocitat d\'atac {speed}',
  'petInfo.defense': 'Defensa {defense}',
  'petInfo.command': 'Ordre',
  'petInfo.cmdNormal': 'Atac per defecte',
  'petInfo.cmdRandom': 'Atac a l\'atzar',
  'petInfo.cmdOwner': 'Ataca amb l\'amo',
  'petInfo.cmdTarget': 'Ataca l\'objectiu',
} satisfies Partial<Record<keyof typeof en, string>>;
