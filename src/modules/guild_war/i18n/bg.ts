/** Bulgarian text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Такъв guild не съществува.',
  'guild.warRequestSent':
    'Заявката за война беше изпратена до майстора на guild.',
  'guild.warMasterOffline': 'Този майстор на guild не е онлайн.',
  'guild.warNotInGuild': 'Не принадлежиш към никой guild.',
  'guild.warRequestFailed': 'Заявката за война се провали.',
  'guild.warOnlyMaster': 'Само майсторът на guild може да обяви война.',
  'guild.warAlready': 'Твоят guild вече е във война.',
  'guild.soccerStarted': 'Battle Soccer срещу {name} започна.',
  'guild.warStarted': 'Войната между guild-ове срещу {name} започна.',
  'guild.warWon': 'Твоят guild спечели войната.',
  'guild.warLost': 'Твоят guild загуби войната.',
  'guild.warCancelled': 'Войната между guild-ове беше отменена.',
  'guild.warCancelledByOther': 'Другият майстор на guild отмени войната.',
  'guild.warEnded': 'Войната между guild-ове приключи.',
  'guild.relFailed': 'Неуспешно',
  'guild.relNotFound': 'Такъв guild не съществува.',
  'guild.relNoAuthorization': 'Нямаш право да правиш това.',
  'guild.relAlreadyAlliance': 'Вече принадлежи към алианс на guild-ове',
  'guild.relAlreadyHostile': 'Двата guild-а вече са във вражда.',
  'guild.relAllianceExists': 'Този guild вече има алианс.',
  'guild.relHostileExists': 'Този guild вече враждува с някого.',
  'guild.relNoAlliance': 'Няма алианс, който да напуснеш.',
  'guild.relNoHostility': 'Няма вражда, която да прекратиш.',
  'guild.relNotAllianceMaster': 'Не е майстор на алианса на guild-ове',
  'guild.relNotRival': 'Този guild не ти е съперник.',
  'guild.relIncomplete':
    'Непълни условия за създаване на алианс на guild-ове',
  'guild.relAllianceFull': 'Алиансът е пълен.',
  'guild.relCancelled': 'Заявката беше отменена.',
  'guild.allianceFormed': 'Алиансът на guild-ове беше сключен.',
  'guild.allianceDissolved': 'Алиансът на guild-ове беше разпуснат.',
  'guild.nowHostile': 'Guild-овете вече са във вражда.',
  'guild.hostilityEnded': 'Враждата приключи.',
  'guild.allianceRemoved': 'Guild-ът беше премахнат от алианса.',
  'guild.allianceRemoveFailed':
    'Този guild не можа да бъде премахнат от алианса.',
} satisfies Partial<Record<keyof typeof en, string>>;
