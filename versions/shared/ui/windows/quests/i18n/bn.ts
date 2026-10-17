/** bn text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'কোয়েস্ট',
  'quest.tab.jobChange': 'ক্লাস পরিবর্তন',
  'quest.tab.castleTemple': 'দুর্গ/মন্দির',
  'quest.npc': 'কোয়েস্ট NPC',
  'quest.whichQuest': 'আপনি কোন কোয়েস্ট নিতে চান?',
  'quest.complete': 'সম্পন্ন করুন',
  'quest.completed': 'কোয়েস্ট সম্পন্ন',
  'quest.inProgress': 'কোয়েস্ট চলছে',
  'quest.notStarted': 'কোয়েস্ট শুরু হয়নি',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'অবরোধের কোনো তথ্য নেই',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'মন্দিরের কোনো তথ্য নেই',
  'quest.proceed': 'কোয়েস্ট চালিয়ে যান',
  'quest.giveUpConfirm':
    'ছেড়ে দিলে আপনি এই বা এর সাথে সম্পর্কিত কোনো কোয়েস্টই আর চালিয়ে যেতে পারবেন না। আপনি কি সত্যিই ছেড়ে দিতে চান?',
  'quest.waitingServer': 'সার্ভারের অপেক্ষা...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'অবদান: {value}',
  'quest.tracker.returnToNpc': 'কোয়েস্ট NPC-র কাছে ফিরে যান',
} satisfies Partial<Record<keyof typeof en, string>>;
