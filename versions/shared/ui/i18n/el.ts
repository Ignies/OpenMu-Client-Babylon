/** el text of `versions/shared/ui`. */

import type en from './en';

export default {
  'servers.loading': 'Φόρτωση λίστας διακομιστών...',
  'servers.serverName': 'Διακομιστής {number}',
  'login.id': 'ID',
  'login.password': 'Κωδικός',
  'options.title': 'Ρυθμίσεις',
  'options.texturePack': 'Υφές μοντέλων',
  'options.texturePack.original': 'Αρχικές',
  'options.texturePackHint': 'Υφές μοντέλων υψηλότερης ανάλυσης, εφαρμόζονται χωρίς επαναφόρτωση',
  'session.toLevel': 'Ως το επίπεδο',
  'bottomBar.pet.normalTip': 'Κανονικό: το κοράκι μένει μαζί σας',
  'bottomBar.pet.randomTip': 'Τυχαίο: επιτίθεται σε ό,τι είναι κοντά',
  'bottomBar.pet.ownerTip': 'Κάτοχος: επιτίθεται σε ό,τι επιτίθεστε εσείς',
  'bottomBar.pet.targetTip': 'Στόχος: επιτίθεται στον τρέχοντα στόχο σας',
  'skills.title': 'Δεξιότητες',
  'skills.empty': 'Δεν έχετε μάθει δεξιότητες',
  'chatRoom.leave': 'Αποχώρηση',
  'command.trade': 'Ανταλλαγή',
  'command.purchase': 'Αγορά',
  'command.party': 'Ομάδα',
  'command.whisper': 'Ψίθυρος',
  'command.follow': 'Ακολούθηση',
  'command.battle': 'Μάχη',
  'warp.title': 'Παράθυρο τηλεμεταφοράς',
  'instrument.putAway': 'Φύλαξη',
  'prompt.trade': 'Ανταλλαγή',
} satisfies Partial<Record<keyof typeof en, string>>;
