/** Italian text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Famiglio',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} non è equipaggiato.',
  'petInfo.waiting': 'In attesa dei dati del famiglio...',
  'petInfo.level': 'Livello {level}',
  'petInfo.life': 'Vita {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Danno {min}~{max} (Tasso {rate})',
  'petInfo.attackSpeed': "Velocità d'attacco {speed}",
  'petInfo.defense': 'Difesa {defense}',
  'petInfo.command': 'Ordine',
  'petInfo.cmdNormal': 'Attacco normale',
  'petInfo.cmdRandom': 'Attacco casuale',
  'petInfo.cmdOwner': 'Attaccare con il padrone',
  'petInfo.cmdTarget': 'Attaccare il bersaglio',
} satisfies Partial<Record<keyof typeof en, string>>;
