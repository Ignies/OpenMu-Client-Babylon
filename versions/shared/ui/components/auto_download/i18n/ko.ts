/** Korean text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': '게임 데이터 다운로드 중',
  'autoDownload.done': '게임 데이터 다운로드 완료',
  'autoDownload.cancel': '취소',
  'autoDownload.hide': '숨기기 (다운로드는 계속됨)',
  'autoDownload.phase.map': '맵 불러오는 중: {name}',
  'autoDownload.phase.icons': '아이템 불러오는 중',
  'autoDownload.phase.audio': '음악과 효과음 불러오는 중',
  'autoDownload.phase.monsters': '캐릭터와 몬스터 불러오는 중',
  'autoDownload.phase.core': '인터페이스와 효과 불러오는 중',
  'autoDownload.left': '{left} MB 남음',
  'autoDownload.received': '{total} MB 중 {got} MB 다운로드됨',
  'autoDownload.screenTitle': '모험을 준비하는 중',
  'autoDownload.screenText': '다음 게임이 더 빨리 열리도록 이 파일들을 보관합니다. 처음 한 번만입니다.',
  'autoDownload.skip': '그냥 들어가기',
  'autoDownload.skipNote': '다운로드는 백그라운드에서 계속됩니다. 게임을 닫아도 멈춘 곳부터 이어집니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
