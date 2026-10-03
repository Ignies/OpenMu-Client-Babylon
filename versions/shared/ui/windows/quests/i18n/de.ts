/** German text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Quest',
  'quest.tab.jobChange': 'Klasse',
  'quest.tab.castleTemple': 'Burg/Tempel',
  'quest.npc': 'Quest-NPC',
  'quest.whichQuest': 'Welche Quest möchtest du annehmen?',
  'quest.complete': 'Abschließen',
  'quest.completed': 'Quest abgeschlossen',
  'quest.inProgress': 'Quest läuft',
  'quest.notStarted': 'Quest nicht begonnen',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Keine Belagerungsinformationen',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Keine Tempelinformationen',
  'quest.proceed': 'Quest fortsetzen',
  'quest.giveUpConfirm': 'Wenn du aufgibst, kannst du diese Quest und alle damit verbundenen Quests nicht mehr fortsetzen. Willst du wirklich aufgeben?',
  'quest.waitingServer': 'Warte auf den Server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Beitrag: {value}',
  'quest.tracker.returnToNpc': 'Kehre zum Quest-NPC zurück',
} satisfies Partial<Record<keyof typeof en, string>>;
