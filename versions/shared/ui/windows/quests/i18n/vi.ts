/** Vietnamese text of the `quests` window. */

import type en from './en';

export default {
  'quest.tab.quest': 'Nhiệm vụ',
  'quest.tab.jobChange': 'Chuyển nghề',
  'quest.tab.castleTemple': 'Thành/Đền',
  'quest.npc': 'NPC nhiệm vụ',
  'quest.whichQuest': 'Bạn muốn nhận nhiệm vụ nào?',
  'quest.complete': 'Hoàn thành',
  'quest.completed': 'Đã hoàn thành nhiệm vụ',
  'quest.inProgress': 'Nhiệm vụ đang làm',
  'quest.notStarted': 'Nhiệm vụ chưa bắt đầu',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Không có thông tin công thành',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Không có thông tin về đền',
  'quest.proceed': 'Tiếp tục nhiệm vụ',
  'quest.giveUpConfirm':
    'Nếu bỏ cuộc, bạn sẽ không thể tiếp tục nhiệm vụ này hay bất kỳ nhiệm vụ liên quan nào. Bạn có thật sự muốn bỏ cuộc?',
  'quest.waitingServer': 'Đang chờ máy chủ...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Cống hiến: {value}',
  'quest.tracker.returnToNpc': 'Quay lại gặp NPC nhiệm vụ',
} satisfies Partial<Record<keyof typeof en, string>>;
