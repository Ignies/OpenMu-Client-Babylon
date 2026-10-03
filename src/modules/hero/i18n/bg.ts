/** Bulgarian text of the `hero` module. */

import type en from './en';

export default {
  'class.elf': 'Elf',

  'emote.greeting': 'Поздрав',
  'emote.goodbye': 'Сбогуване',
  'emote.clap': 'Ръкопляскане',
  'emote.cheer': 'Ликуване',
  'emote.smile': 'Усмивка',
  'emote.cry': 'Плач',
  'emote.respect': 'Уважение',
  'emote.salute': 'Военен поздрав',
  'emote.win': 'Победа',
  'emote.gesture': 'Жест',
  'emote.direction': 'Посочване',
  'emote.unknown': 'Недоумение',
  'emote.awkward': 'Неудобство',
  'emote.see': 'Втренчване',
  'emote.sleep': 'Сънливост',
  'emote.cold': 'Студ',
  'emote.again': 'Пак',
  'emote.rush': 'Напред',
  'emote.scissors': 'Ножица',
  'emote.rock': 'Камък',
  'emote.paper': 'Хартия',
  'emote.hustle': 'По-бързо',
  'emote.provocation': 'Провокация',
  'emote.lookAround': 'Оглеждане',
  'emote.cheers': 'Наздраве',
  'notify.pointNotAdded': 'Точката не можа да бъде добавена',
  'notify.levelUp': 'Ниво {level}',
  'notify.masterLevelUp': 'Ниво на майстор {level}',
  'notify.fruitAdd': '{stat} +{points} (плод)',
  'notify.fruitRemove': '{stat} -{points} (плод)',
  'notify.fruitNoEffect': 'Плодът не подейства',
  'notify.fruitLimit': 'Днес не можеш да използваш повече плодове',
  'notify.fruitFloor': '{stat} не може да падне повече',
  'notify.fruitEquipped':
    'Първо свали предметите, които изискват тази характеристика',
  'notify.fruitNotNow': 'Сега не можеш да използваш този плод',
} satisfies Partial<Record<keyof typeof en, string>>;
