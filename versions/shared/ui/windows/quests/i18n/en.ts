/** English text of the `quests` window. See src/i18n/readme.md. */

const en = {
  'quest.tab.quest': 'Quest',
  'quest.tab.jobChange': 'Job change',
  'quest.tab.castleTemple': 'Castle/Temple',
  'quest.npc': 'Quest NPC',
  'quest.whichQuest': 'Which quest would you like to take?',
  'quest.complete': 'Complete',
  'quest.completed': 'Quest completed',
  'quest.inProgress': 'Quest in progress',
  'quest.notStarted': 'Quest not started',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'No siege information',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'No temple information',
  'quest.proceed': 'Proceed with quest',
  'quest.giveUpConfirm': 'If you give up, you will not be able to continue with this or any related quests. Do you really want to give up?',
  'quest.waitingServer': 'Waiting for the server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Contribution: {value}',
  'quest.tracker.returnToNpc': 'Return to the quest NPC',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'versions/shared/ui/windows/quests': typeof en;
  }
}
