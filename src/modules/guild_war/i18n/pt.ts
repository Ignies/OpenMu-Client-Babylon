/** Portuguese text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Essa guild não existe.',
  'guild.warRequestSent':
    'O pedido de guerra foi enviado ao mestre da guild.',
  'guild.warMasterOffline': 'Esse mestre de guild não está online.',
  'guild.warNotInGuild': 'Você não pertence a nenhuma guild.',
  'guild.warRequestFailed': 'O pedido de guerra falhou.',
  'guild.warOnlyMaster': 'Só o mestre da guild pode declarar guerra.',
  'guild.warAlready': 'Sua guild já está em guerra.',
  'guild.soccerStarted': 'O Battle Soccer contra {name} começou.',
  'guild.warStarted': 'A guerra de guilds contra {name} começou.',
  'guild.warWon': 'Sua guild venceu a guerra.',
  'guild.warLost': 'Sua guild perdeu a guerra.',
  'guild.warCancelled': 'A guerra de guilds foi cancelada.',
  'guild.warCancelledByOther': 'O outro mestre de guild cancelou a guerra.',
  'guild.warEnded': 'A guerra de guilds terminou.',
  'guild.relFailed': 'Falhou',
  'guild.relNotFound': 'Essa guild não existe.',
  'guild.relNoAuthorization': 'Você não tem permissão para fazer isso.',
  'guild.relAlreadyAlliance': 'Já pertence a uma aliança de guilds',
  'guild.relAlreadyHostile': 'As duas guilds já são rivais.',
  'guild.relAllianceExists': 'Essa guild já tem uma aliança.',
  'guild.relHostileExists': 'Essa guild já é rival de outra.',
  'guild.relNoAlliance': 'Não há aliança para deixar.',
  'guild.relNoHostility': 'Não há rivalidade para encerrar.',
  'guild.relNotAllianceMaster': 'Não é mestre da aliança de guilds',
  'guild.relNotRival': 'Essa guild não é sua rival.',
  'guild.relIncomplete':
    'Requisitos incompletos para criar uma aliança de guilds',
  'guild.relAllianceFull': 'A aliança está cheia.',
  'guild.relCancelled': 'O pedido foi cancelado.',
  'guild.allianceFormed': 'A aliança de guilds foi formada.',
  'guild.allianceDissolved': 'A aliança de guilds foi dissolvida.',
  'guild.nowHostile': 'As guilds agora são rivais.',
  'guild.hostilityEnded': 'A rivalidade terminou.',
  'guild.allianceRemoved': 'A guild foi removida da aliança.',
  'guild.allianceRemoveFailed':
    'Não foi possível remover essa guild da aliança.',
} satisfies Partial<Record<keyof typeof en, string>>;
