/** Portuguese text of the `hero` module. */

import type en from './en';

export default {
  'class.elf': 'Elf',

  'emote.greeting': 'Saudação',
  'emote.goodbye': 'Despedida',
  'emote.clap': 'Aplaudir',
  'emote.cheer': 'Comemorar',
  'emote.smile': 'Sorrir',
  'emote.cry': 'Chorar',
  'emote.respect': 'Respeito',
  'emote.salute': 'Continência',
  'emote.win': 'Vitória',
  'emote.gesture': 'Gesto',
  'emote.direction': 'Apontar',
  'emote.unknown': 'Confuso',
  'emote.awkward': 'Constrangido',
  'emote.see': 'Encarar',
  'emote.sleep': 'Sono',
  'emote.cold': 'Frio',
  'emote.again': 'De novo',
  'emote.rush': 'Avançar',
  'emote.scissors': 'Tesoura',
  'emote.rock': 'Pedra',
  'emote.paper': 'Papel',
  'emote.hustle': 'Rápido',
  'emote.provocation': 'Provocar',
  'emote.lookAround': 'Olhar em volta',
  'emote.cheers': 'Saúde',
  'notify.pointNotAdded': 'Não foi possível adicionar o ponto',
  'notify.levelUp': 'Nível {level}',
  'notify.masterLevelUp': 'Nível de mestre {level}',
  'notify.fruitAdd': '{stat} +{points} (fruta)',
  'notify.fruitRemove': '{stat} -{points} (fruta)',
  'notify.fruitNoEffect': 'A fruta não fez efeito',
  'notify.fruitLimit': 'Você não pode usar mais frutas hoje',
  'notify.fruitFloor': '{stat} não pode baixar mais',
  'notify.fruitEquipped':
    'Tire antes os itens que exigem esse atributo',
  'notify.fruitNotNow': 'Você não pode usar esta fruta agora',
} satisfies Partial<Record<keyof typeof en, string>>;
