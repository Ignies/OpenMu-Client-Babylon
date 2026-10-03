/** Korean text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': '확인',
  'common.cancel': '취소',
  'common.close': '닫기',
  'common.none': '없음',
  'common.create': '생성',
  'common.creating': '생성 중...',
  'common.send': '보내기',
  'common.sending': '보내는 중...',
  'common.loading': '불러오는 중...',
  'common.warning': '주의',
  'common.level': '레벨',
  'common.offline': '오프라인',
  'common.off': '끔',
  'common.zen': '젠',
  'common.notEnoughZen': '젠이 부족합니다',
  'options.quality.classic': '클래식',
  'options.quality.enhanced': '향상',
} satisfies Partial<Record<keyof typeof en, string>>;
