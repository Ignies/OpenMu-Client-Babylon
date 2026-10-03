/** Spanish text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Mascota',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} no está equipado.',
  'petInfo.waiting': 'Esperando los datos de la mascota...',
  'petInfo.level': 'Nivel {level}',
  'petInfo.life': 'Vida {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Daño {min}~{max} (Tasa {rate})',
  'petInfo.attackSpeed': 'Velocidad de ataque {speed}',
  'petInfo.defense': 'Defensa {defense}',
  'petInfo.command': 'Orden',
  'petInfo.cmdNormal': 'Ataque normal',
  'petInfo.cmdRandom': 'Ataque aleatorio',
  'petInfo.cmdOwner': 'Atacar con el dueño',
  'petInfo.cmdTarget': 'Atacar al objetivo',
  'petInfo.close': 'Cerrar',
} satisfies Partial<Record<keyof typeof en, string>>;
