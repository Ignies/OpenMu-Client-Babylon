/** Korean text of the `vault` window. */

import type en from './en';

export default {
  'vault.depositJewels': '보석',
  'vault.depositJewelsHint': '인벤토리의 보석을 모두 창고로 옮깁니다',

  'vault.title': '창고',
  'vault.unlocked': '잠금 해제',
  'vault.locked': '잠김',
  'vault.fee': '수수료',
  'vault.deposit': '젠 맡기기',
  'vault.withdraw': '젠 찾기',
  'vault.pin': '창고 비밀번호',
} satisfies Partial<Record<keyof typeof en, string>>;
