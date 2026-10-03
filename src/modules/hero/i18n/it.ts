/** Italian text of the `hero` module. */

import type en from './en';

export default {
  'class.elf': 'Elf',

  'emote.greeting': 'Saluto',
  'emote.goodbye': 'Congedo',
  'emote.clap': 'Applaudi',
  'emote.cheer': 'Esulta',
  'emote.smile': 'Sorridi',
  'emote.cry': 'Piangi',
  'emote.respect': 'Rispetto',
  'emote.salute': 'Saluto militare',
  'emote.win': 'Vittoria',
  'emote.gesture': 'Gesto',
  'emote.direction': 'Indica',
  'emote.unknown': 'Confusione',
  'emote.awkward': 'Imbarazzo',
  'emote.see': 'Fissa',
  'emote.sleep': 'Sonno',
  'emote.cold': 'Freddo',
  'emote.again': 'Di nuovo',
  'emote.rush': 'All’attacco',
  'emote.scissors': 'Forbici',
  'emote.rock': 'Sasso',
  'emote.paper': 'Carta',
  'emote.hustle': 'Sbrigati',
  'emote.provocation': 'Provoca',
  'emote.lookAround': 'Guardati intorno',
  'emote.cheers': 'Cin cin',
  'notify.pointNotAdded': 'Non è stato possibile assegnare il punto',
  'notify.levelUp': 'Livello {level}',
  'notify.masterLevelUp': 'Livello di maestria {level}',
  'notify.fruitAdd': '{stat} +{points} (frutto)',
  'notify.fruitRemove': '{stat} -{points} (frutto)',
  'notify.fruitNoEffect': 'Il frutto non ha avuto effetto',
  'notify.fruitLimit': 'Oggi non puoi usare altri frutti',
  'notify.fruitFloor': '{stat} non può scendere oltre',
  'notify.fruitEquipped':
    'Togli prima gli oggetti che richiedono questa caratteristica',
  'notify.fruitNotNow': 'Non puoi usare questo frutto adesso',
} satisfies Partial<Record<keyof typeof en, string>>;
