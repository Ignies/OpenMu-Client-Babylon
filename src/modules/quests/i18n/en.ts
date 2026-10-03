/** English text of the `quests` module. See src/i18n/readme.md. */

const en = {
  'quest.unavailable': 'You cannot take this quest right now',
  'quest.notFulfilled': 'The quest conditions are not fulfilled yet',
  'quest.noneInProgress': 'You have no quest in progress',
  'quest.inventoryFull': 'There is no space in your inventory for the reward',
  'quest.oneOf': 'One of:',
  'quest.item': 'Item',
  'quest.requirements': 'Requirements',
  'quest.rewards': 'Rewards',
  'quest.npcHasNone': 'This NPC has no quest for you',
  'quest.completedNamed': 'Quest completed: {subject}',
  'quest.stateFailed': 'The quest state could not be changed',
  'quest.rewardPoints': 'Quest reward: {count} level-up points',
  'quest.evolved': 'You have evolved to your second class',
  'quest.evolvedThird': 'You have evolved to your third class',
  'quest.subjectFallback': 'Quest {number}-{group}',
  'quest.comboLearned': 'You have learned the combo skill',
  'quest.req.hunt': 'Hunt {name}  {progress}',
  'quest.req.bring': 'Bring {name}  {progress}',
  'quest.req.level': 'Reach level {level}',
  'quest.req.money': '{amount} Zen',
  'quest.req.skill': 'Learn skill {id}',
  'quest.req.eventKills': 'Event map kills  {progress}',
  'quest.req.devilSquarePoints': 'Devil Square points  {progress}',
  'quest.req.pvpPoints': 'PvP points  {progress}',
  'quest.req.talk': 'Talk to {name}',
  'quest.req.other': 'Condition {type}  {progress}',
  'quest.reward.experience': '{amount} Experience',
  'quest.reward.money': '{amount} Zen',
  'quest.reward.item': '{name} x{count}',
  'quest.reward.gens': '{amount} Gens contribution',
  'quest.reward.other': 'Reward {type} x{count}',
  'quest.req.tutorial': 'Complete the tutorial',
  'quest.req.buff': 'Receive the buff',
  'quest.req.bloodCastleGate': 'Break the Blood Castle gate',
  'quest.req.bloodCastle': 'Clear Blood Castle',
  'quest.req.chaosCastle': 'Win Chaos Castle',
  'quest.req.devilSquare': 'Clear Devil Square',
  'quest.req.illusionTemple': 'Win Illusion Temple',
  'quest.dialogue.select': 'Select a quest.',
  'quest.dialogue.none': 'There is no available quest. Please come back later.',
  'quest.dialogue.goBack': 'Go back.',
  'quest.dialogue.words': 'What can I do for you?',
  'quest.dialogue.accept': 'Accept a quest.',
};

export default en;

declare module '@/i18n' {
  interface TextOwners {
    'src/modules/quests': typeof en;
  }
}
