/** Portuguese text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'Mascote',
  'petInfo.darkHorse': 'Dark Horse',
  'petInfo.darkRaven': 'Dark Raven',
  'petInfo.notEquipped': '{pet} não está equipado.',
  'petInfo.waiting': 'Aguardando os dados do mascote...',
  'petInfo.level': 'Nível {level}',
  'petInfo.life': 'Vida {current} / {max}',
  'petInfo.exp': 'Exp {current} / {next}',
  'petInfo.damage': 'Dano {min}~{max} (Taxa {rate})',
  'petInfo.attackSpeed': 'Velocidade de ataque {speed}',
  'petInfo.defense': 'Defesa {defense}',
  'petInfo.command': 'Comando',
  'petInfo.cmdNormal': 'Ataque normal',
  'petInfo.cmdRandom': 'Ataque aleatório',
  'petInfo.cmdOwner': 'Atacar com o dono',
  'petInfo.cmdTarget': 'Atacar o alvo',
} satisfies Partial<Record<keyof typeof en, string>>;
