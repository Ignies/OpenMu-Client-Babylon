/** tr text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Görev',
  'quest.tab.jobChange': 'Sınıf değişimi',
  'quest.tab.castleTemple': 'Kale/Tapınak',
  'quest.npc': 'Görev NPC\'si',
  'quest.whichQuest': 'Hangi görevi almak istersin?',
  'quest.complete': 'Tamamla',
  'quest.completed': 'Görev tamamlandı',
  'quest.inProgress': 'Görev devam ediyor',
  'quest.notStarted': 'Görev başlamadı',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Kuşatma bilgisi yok',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Tapınak bilgisi yok',
  'quest.proceed': 'Göreve devam et',
  'quest.giveUpConfirm':
    'Vazgeçersen bu göreve ya da bağlantılı görevlere devam edemezsin. Gerçekten vazgeçmek istiyor musun?',
  'quest.waitingServer': 'Sunucu bekleniyor...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Katkı: {value}',
  'quest.tracker.returnToNpc': 'Görev NPC\'sine dön',
} satisfies Partial<Record<keyof typeof en, string>>;
