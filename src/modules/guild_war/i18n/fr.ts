/** French text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Cette guilde n’existe pas.',
  'guild.warRequestSent':
    'La demande de guerre a été envoyée au maître de guilde.',
  'guild.warMasterOffline': 'Ce maître de guilde n’est pas connecté.',
  'guild.warNotInGuild': 'Vous n’appartenez à aucune guilde.',
  'guild.warRequestFailed': 'La demande de guerre a échoué.',
  'guild.warOnlyMaster': 'Seul le maître de guilde peut déclarer la guerre.',
  'guild.warAlready': 'Votre guilde est déjà en guerre.',
  'guild.soccerStarted': 'Le Battle Soccer contre {name} a commencé.',
  'guild.warStarted': 'La guerre de guildes contre {name} a commencé.',
  'guild.warWon': 'Votre guilde a gagné la guerre.',
  'guild.warLost': 'Votre guilde a perdu la guerre.',
  'guild.warCancelled': 'La guerre de guildes a été annulée.',
  'guild.warCancelledByOther': 'L’autre maître de guilde a annulé la guerre.',
  'guild.warEnded': 'La guerre de guildes est terminée.',
  'guild.relFailed': 'Échec',
  'guild.relNotFound': 'Cette guilde n’existe pas.',
  'guild.relNoAuthorization': 'Vous n’avez pas le droit de faire cela.',
  'guild.relAlreadyAlliance': 'Appartient déjà à une alliance de guildes',
  'guild.relAlreadyHostile': 'Les deux guildes sont déjà rivales.',
  'guild.relAllianceExists': 'Cette guilde a déjà une alliance.',
  'guild.relHostileExists': 'Cette guilde est déjà rivale d’une autre.',
  'guild.relNoAlliance': 'Il n’y a aucune alliance à quitter.',
  'guild.relNoHostility': 'Il n’y a aucune rivalité à terminer.',
  'guild.relNotAllianceMaster': 'N’est pas maître de l’alliance de guildes',
  'guild.relNotRival': 'Cette guilde n’est pas votre rivale.',
  'guild.relIncomplete':
    'Conditions incomplètes pour créer une alliance de guildes',
  'guild.relAllianceFull': 'L’alliance est complète.',
  'guild.relCancelled': 'La demande a été annulée.',
  'guild.allianceFormed': 'L’alliance de guildes a été formée.',
  'guild.allianceDissolved': 'L’alliance de guildes a été dissoute.',
  'guild.nowHostile': 'Les guildes sont maintenant rivales.',
  'guild.hostilityEnded': 'La rivalité est terminée.',
  'guild.allianceRemoved': 'La guilde a été retirée de l’alliance.',
  'guild.allianceRemoveFailed':
    'Cette guilde n’a pas pu être retirée de l’alliance.',
} satisfies Partial<Record<keyof typeof en, string>>;
