/** German text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Diese Gilde gibt es nicht.',
  'guild.warRequestSent': 'Die Kriegsanfrage ging an den Gildenmeister.',
  'guild.warMasterOffline': 'Dieser Gildenmeister ist nicht online.',
  'guild.warNotInGuild': 'Du gehörst zu keiner Gilde.',
  'guild.warRequestFailed': 'Die Kriegsanfrage ist fehlgeschlagen.',
  'guild.warOnlyMaster': 'Nur der Gildenmeister kann Krieg erklären.',
  'guild.warAlready': 'Deine Gilde ist bereits im Krieg.',
  'guild.soccerStarted': 'Battle Soccer gegen {name} hat begonnen.',
  'guild.warStarted': 'Der Gildenkrieg gegen {name} hat begonnen.',
  'guild.warWon': 'Deine Gilde hat den Krieg gewonnen.',
  'guild.warLost': 'Deine Gilde hat den Krieg verloren.',
  'guild.warCancelled': 'Der Gildenkrieg wurde abgebrochen.',
  'guild.warCancelledByOther':
    'Der andere Gildenmeister hat den Krieg abgebrochen.',
  'guild.warEnded': 'Der Gildenkrieg ist vorbei.',
  'guild.relFailed': 'Fehlgeschlagen',
  'guild.relNotFound': 'Diese Gilde gibt es nicht.',
  'guild.relNoAuthorization': 'Das darfst du nicht.',
  'guild.relAlreadyAlliance': 'Gehört bereits zu einer Gildenallianz',
  'guild.relAlreadyHostile': 'Die beiden Gilden sind bereits verfeindet.',
  'guild.relAllianceExists': 'Diese Gilde hat bereits eine Allianz.',
  'guild.relHostileExists':
    'Diese Gilde ist bereits mit jemandem verfeindet.',
  'guild.relNoAlliance': 'Es gibt keine Allianz zu verlassen.',
  'guild.relNoHostility': 'Es gibt keine Feindschaft zu beenden.',
  'guild.relNotAllianceMaster': 'Kein Meister der Gildenallianz',
  'guild.relNotRival': 'Diese Gilde ist nicht dein Rivale.',
  'guild.relIncomplete':
    'Unvollständige Voraussetzungen für eine Gildenallianz',
  'guild.relAllianceFull': 'Die Allianz ist voll.',
  'guild.relCancelled': 'Die Anfrage wurde abgebrochen.',
  'guild.allianceFormed': 'Die Gildenallianz wurde geschlossen.',
  'guild.allianceDissolved': 'Die Gildenallianz wurde aufgelöst.',
  'guild.nowHostile': 'Die Gilden sind nun verfeindet.',
  'guild.hostilityEnded': 'Die Feindschaft ist beendet.',
  'guild.allianceRemoved': 'Die Gilde wurde aus der Allianz entfernt.',
  'guild.allianceRemoveFailed':
    'Diese Gilde konnte nicht aus der Allianz entfernt werden.',
} satisfies Partial<Record<keyof typeof en, string>>;
