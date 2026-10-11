/** Russian text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'Вы вышли из группы.',
  'party.onlyLeaderInvites': 'Приглашать может только лидер группы.',
  'party.full': 'Группа заполнена.',
  'party.invitationSent': 'Приглашение в группу отправлено игроку {name}.',
  'party.reply.on': 'Приглашения в группу: вас спросят.',
  'party.reply.off': 'Приглашения в группу: отклоняются сами. /re on, чтобы снова спрашивали.',
  'party.reply.auto': 'Приглашения в группу: принимаются сами. /re on, чтобы снова спрашивали.',
  'party.reply.status': 'Приглашения в группу: /re {mode}. Используйте /re on, /re off или /re auto.',
  'party.reply.declined': 'Приглашение в группу от {name} отклонено (/re).',
  'party.reply.accepted': 'Приглашение в группу от {name} принято (/re).',
  'guild.joinRequestSent': 'Запрос в guild отправлен игроку {name}.',
  'guild.onlyMasterAppoints':
    'Назначать участников может только мастер guild.',
  'guild.onlyMasterCan': 'Это может сделать только мастер guild.',
  'guild.allianceRequestSent': 'Запрос альянса отправлен игроку {name}.',
  'guild.hostilityRequestSent': 'Объявление вражды отправлено игроку {name}.',
} satisfies Partial<Record<keyof typeof en, string>>;
