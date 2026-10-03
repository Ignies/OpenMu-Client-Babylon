/** Romanian text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Acel guild nu există.',
  'guild.warRequestSent':
    'Cererea de război a fost trimisă maestrului guildului.',
  'guild.warMasterOffline': 'Acel maestru de guild nu este online.',
  'guild.warNotInGuild': 'Nu faci parte din niciun guild.',
  'guild.warRequestFailed': 'Cererea de război a eșuat.',
  'guild.warOnlyMaster': 'Doar maestrul guildului poate declara război.',
  'guild.warAlready': 'Guildul tău este deja în război.',
  'guild.soccerStarted': 'Battle Soccer împotriva {name} a început.',
  'guild.warStarted': 'Războiul de guild împotriva {name} a început.',
  'guild.warWon': 'Guildul tău a câștigat războiul.',
  'guild.warLost': 'Guildul tău a pierdut războiul.',
  'guild.warCancelled': 'Războiul de guild a fost anulat.',
  'guild.warCancelledByOther': 'Celălalt maestru de guild a anulat războiul.',
  'guild.warEnded': 'Războiul de guild s-a încheiat.',
  'guild.relFailed': 'A eșuat',
  'guild.relNotFound': 'Acel guild nu există.',
  'guild.relNoAuthorization': 'Nu ai voie să faci asta.',
  'guild.relAlreadyAlliance': 'Face deja parte dintr-o alianță de guilduri',
  'guild.relAlreadyHostile': 'Cele două guilduri sunt deja rivale.',
  'guild.relAllianceExists': 'Acel guild are deja o alianță.',
  'guild.relHostileExists': 'Acel guild este deja rival cu altul.',
  'guild.relNoAlliance': 'Nu există nicio alianță de părăsit.',
  'guild.relNoHostility': 'Nu există nicio rivalitate de încheiat.',
  'guild.relNotAllianceMaster': 'Nu este maestrul alianței de guilduri',
  'guild.relNotRival': 'Acel guild nu îți este rival.',
  'guild.relIncomplete':
    'Cerințe incomplete pentru crearea unei alianțe de guilduri',
  'guild.relAllianceFull': 'Alianța este plină.',
  'guild.relCancelled': 'Cererea a fost anulată.',
  'guild.allianceFormed': 'Alianța de guilduri a fost formată.',
  'guild.allianceDissolved': 'Alianța de guilduri a fost desființată.',
  'guild.nowHostile': 'Guildurile sunt acum rivale.',
  'guild.hostilityEnded': 'Rivalitatea s-a încheiat.',
  'guild.allianceRemoved': 'Guildul a fost scos din alianță.',
  'guild.allianceRemoveFailed': 'Acel guild nu a putut fi scos din alianță.',
} satisfies Partial<Record<keyof typeof en, string>>;
