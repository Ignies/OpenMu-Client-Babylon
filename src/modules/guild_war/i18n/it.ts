/** Italian text of the `guild_war` module. */

import type en from './en';

export default {
  'guild.warNotFound': 'Quella gilda non esiste.',
  'guild.warRequestSent':
    'La richiesta di guerra è stata inviata al master della gilda.',
  'guild.warMasterOffline': 'Quel master di gilda non è online.',
  'guild.warNotInGuild': 'Non appartieni a nessuna gilda.',
  'guild.warRequestFailed': 'La richiesta di guerra è fallita.',
  'guild.warOnlyMaster': 'Solo il master della gilda può dichiarare guerra.',
  'guild.warAlready': 'La tua gilda è già in guerra.',
  'guild.soccerStarted': 'Il Battle Soccer contro {name} è iniziato.',
  'guild.warStarted': 'La guerra tra gilde contro {name} è iniziata.',
  'guild.warWon': 'La tua gilda ha vinto la guerra.',
  'guild.warLost': 'La tua gilda ha perso la guerra.',
  'guild.warCancelled': 'La guerra tra gilde è stata annullata.',
  'guild.warCancelledByOther':
    "L'altro master di gilda ha annullato la guerra.",
  'guild.warEnded': 'La guerra tra gilde è finita.',
  'guild.relFailed': 'Fallito',
  'guild.relNotFound': 'Quella gilda non esiste.',
  'guild.relNoAuthorization': 'Non ti è permesso farlo.',
  'guild.relAlreadyAlliance': "Appartiene già a un'alleanza di gilde",
  'guild.relAlreadyHostile': 'Le due gilde sono già rivali.',
  'guild.relAllianceExists': "Quella gilda ha già un'alleanza.",
  'guild.relHostileExists': "Quella gilda è già rivale di un'altra.",
  'guild.relNoAlliance': "Non c'è nessuna alleanza da lasciare.",
  'guild.relNoHostility': "Non c'è nessuna rivalità da chiudere.",
  'guild.relNotAllianceMaster': "Non è master dell'alleanza di gilde",
  'guild.relNotRival': 'Quella gilda non è tua rivale.',
  'guild.relIncomplete':
    "Requisiti incompleti per creare un'alleanza di gilde",
  'guild.relAllianceFull': "L'alleanza è al completo.",
  'guild.relCancelled': 'La richiesta è stata annullata.',
  'guild.allianceFormed': "L'alleanza di gilde è stata formata.",
  'guild.allianceDissolved': "L'alleanza di gilde è stata sciolta.",
  'guild.nowHostile': 'Le gilde ora sono rivali.',
  'guild.hostilityEnded': 'La rivalità è finita.',
  'guild.allianceRemoved': "La gilda è stata tolta dall'alleanza.",
  'guild.allianceRemoveFailed':
    "Non è stato possibile togliere quella gilda dall'alleanza.",
} satisfies Partial<Record<keyof typeof en, string>>;
