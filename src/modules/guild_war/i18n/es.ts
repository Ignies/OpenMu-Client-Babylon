/** Spanish text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Ese guild no existe.',
  'guild.warRequestSent':
    'La solicitud de guerra se envió al máster del guild.',
  'guild.warMasterOffline': 'Ese máster de guild no está conectado.',
  'guild.warNotInGuild': 'No perteneces a ningún guild.',
  'guild.warRequestFailed': 'La solicitud de guerra ha fallado.',
  'guild.warOnlyMaster': 'Solo el máster del guild puede declarar la guerra.',
  'guild.warAlready': 'Tu guild ya está en guerra.',
  'guild.soccerStarted': 'Ha empezado el Battle Soccer contra {name}.',
  'guild.warStarted': 'Ha empezado la guerra de guilds contra {name}.',
  'guild.warWon': 'Tu guild ha ganado la guerra.',
  'guild.warLost': 'Tu guild ha perdido la guerra.',
  'guild.warCancelled': 'La guerra de guilds fue cancelada.',
  'guild.warCancelledByOther': 'El otro máster de guild canceló la guerra.',
  'guild.warEnded': 'La guerra de guilds ha terminado.',
  'guild.relFailed': 'Ha fallado',
  'guild.relNotFound': 'Ese guild no existe.',
  'guild.relNoAuthorization': 'No tienes permiso para hacer eso.',
  'guild.relAlreadyAlliance': 'Ya pertenece a una alianza de guilds',
  'guild.relAlreadyHostile': 'Los dos guilds ya son rivales.',
  'guild.relAllianceExists': 'Ese guild ya tiene una alianza.',
  'guild.relHostileExists': 'Ese guild ya es rival de otro.',
  'guild.relNoAlliance': 'No hay ninguna alianza que dejar.',
  'guild.relNoHostility': 'No hay ninguna rivalidad que terminar.',
  'guild.relNotAllianceMaster': 'No es máster de la alianza de guilds',
  'guild.relNotRival': 'Ese guild no es tu rival.',
  'guild.relIncomplete':
    'No se cumplen los requisitos para crear una alianza de guilds',
  'guild.relAllianceFull': 'La alianza está llena.',
  'guild.relCancelled': 'La solicitud fue cancelada.',
  'guild.allianceFormed': 'Se ha formado la alianza de guilds.',
  'guild.allianceDissolved': 'Se ha disuelto la alianza de guilds.',
  'guild.nowHostile': 'Los guilds ahora son rivales.',
  'guild.hostilityEnded': 'La rivalidad ha terminado.',
  'guild.allianceRemoved': 'El guild fue sacado de la alianza.',
  'guild.allianceRemoveFailed': 'No se pudo sacar a ese guild de la alianza.',
} satisfies Partial<Record<keyof typeof en, string>>;
