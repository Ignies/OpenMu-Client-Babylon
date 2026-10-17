/** el text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Αποστολή',
  'quest.tab.jobChange': 'Αλλαγή κλάσης',
  'quest.tab.castleTemple': 'Κάστρο/Ναός',
  'quest.npc': 'NPC αποστολών',
  'quest.whichQuest': 'Ποια αποστολή θέλετε να αναλάβετε;',
  'quest.complete': 'Ολοκλήρωση',
  'quest.completed': 'Η αποστολή ολοκληρώθηκε',
  'quest.inProgress': 'Αποστολή σε εξέλιξη',
  'quest.notStarted': 'Η αποστολή δεν έχει αρχίσει',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Καμία πληροφορία πολιορκίας',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Καμία πληροφορία ναού',
  'quest.proceed': 'Συνέχεια αποστολής',
  'quest.giveUpConfirm':
    'Αν τα παρατήσετε, δεν θα μπορείτε να συνεχίσετε ούτε αυτή ούτε σχετικές αποστολές. Θέλετε σίγουρα να τα παρατήσετε;',
  'quest.waitingServer': 'Αναμονή για τον διακομιστή...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Συνεισφορά: {value}',
  'quest.tracker.returnToNpc': 'Επιστρέψτε στο NPC της αποστολής',
} satisfies Partial<Record<keyof typeof en, string>>;
