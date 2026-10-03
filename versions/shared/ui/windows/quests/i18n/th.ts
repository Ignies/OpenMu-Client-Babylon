/** Thai text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'เควส',
  'quest.tab.jobChange': 'อาชีพ',
  'quest.tab.castleTemple': 'ปราสาท/วิหาร',
  'quest.npc': 'NPC เควส',
  'quest.whichQuest': 'คุณอยากรับเควสใด?',
  'quest.complete': 'ทำให้เสร็จ',
  'quest.completed': 'เควสสำเร็จ',
  'quest.inProgress': 'เควสกำลังดำเนินอยู่',
  'quest.notStarted': 'ยังไม่เริ่มเควส',
  'quest.castleSiege': 'ศึกชิงปราสาท',
  'quest.noSiegeInfo': 'ไม่มีข้อมูลการชิงปราสาท',
  'quest.illusionTemple': 'วิหารมายา',
  'quest.noTempleInfo': 'ไม่มีข้อมูลวิหาร',
  'quest.proceed': 'ดำเนินเควสต่อ',
  'quest.giveUpConfirm': 'หากยกเลิก คุณจะไม่สามารถทำเควสนี้และเควสที่เกี่ยวข้องต่อได้อีก ต้องการยกเลิกจริงหรือไม่?',
  'quest.waitingServer': 'กำลังรอเซิร์ฟเวอร์...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'การมีส่วนร่วม: {value}',
  'quest.tracker.returnToNpc': 'กลับไปหา NPC ของเควสต์',
} satisfies Partial<Record<keyof typeof en, string>>;
