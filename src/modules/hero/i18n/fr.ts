/** French text of the `hero` module. */

import type en from './en';

export default {
  'class.elf': 'Elf',

  'emote.greeting': 'Salut',
  'emote.goodbye': 'Au revoir',
  'emote.clap': 'Applaudir',
  'emote.cheer': 'Encourager',
  'emote.smile': 'Sourire',
  'emote.cry': 'Pleurer',
  'emote.respect': 'Respect',
  'emote.salute': 'Salut militaire',
  'emote.win': 'Victoire',
  'emote.gesture': 'Geste',
  'emote.direction': 'Montrer',
  'emote.unknown': 'Confusion',
  'emote.awkward': 'Gêne',
  'emote.see': 'Fixer',
  'emote.sleep': 'Sommeil',
  'emote.cold': 'Froid',
  'emote.again': 'Encore',
  'emote.rush': 'À l’assaut',
  'emote.scissors': 'Ciseaux',
  'emote.rock': 'Pierre',
  'emote.paper': 'Papier',
  'emote.hustle': 'Vite',
  'emote.provocation': 'Provoquer',
  'emote.lookAround': 'Regarder autour',
  'emote.cheers': 'Santé',
  'notify.pointNotAdded': 'Le point n’a pas pu être ajouté',
  'notify.levelUp': 'Niveau {level}',
  'notify.masterLevelUp': 'Niveau de maîtrise {level}',
  'notify.fruitAdd': '{stat} +{points} (fruit)',
  'notify.fruitRemove': '{stat} -{points} (fruit)',
  'notify.fruitNoEffect': 'Le fruit n’a rien fait',
  'notify.fruitLimit': 'Vous ne pouvez plus utiliser de fruits aujourd’hui',
  'notify.fruitFloor': '{stat} ne peut pas descendre plus bas',
  'notify.fruitEquipped':
    'Retirez d’abord les objets qui demandent cette caractéristique',
  'notify.fruitNotNow': 'Vous ne pouvez pas utiliser ce fruit maintenant',
} satisfies Partial<Record<keyof typeof en, string>>;
