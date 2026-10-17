/** id text of `versions/shared/ui/windows/quests`. */

import type en from './en';

export default {
  'quest.tab.quest': 'Misi',
  'quest.tab.jobChange': 'Perubahan kelas',
  'quest.tab.castleTemple': 'Kastil/Kuil',
  'quest.npc': 'NPC Misi',
  'quest.whichQuest': 'Misi mana yang ingin kamu ambil?',
  'quest.complete': 'Selesaikan',
  'quest.completed': 'Misi selesai',
  'quest.inProgress': 'Misi berlangsung',
  'quest.notStarted': 'Misi belum dimulai',
  'quest.castleSiege': 'Castle Siege',
  'quest.noSiegeInfo': 'Tidak ada informasi pengepungan',
  'quest.illusionTemple': 'Illusion Temple',
  'quest.noTempleInfo': 'Tidak ada informasi kuil',
  'quest.proceed': 'Lanjutkan misi',
  'quest.giveUpConfirm':
    'Jika kamu menyerah, kamu tidak akan dapat melanjutkan misi ini maupun misi terkait lainnya. Yakin ingin menyerah?',
  'quest.waitingServer': 'Menunggu server...',
  'quest.npcFallback': 'NPC {type}',
  'quest.contribution': 'Kontribusi: {value}',
  'quest.tracker.returnToNpc': 'Kembali ke NPC misi',
} satisfies Partial<Record<keyof typeof en, string>>;
