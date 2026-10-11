/** Korean text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket 연결 오류',
  'notify.connectionLost': '서버와의 연결이 끊어졌습니다',
  'notify.serverListLost': '서버 목록과의 연결이 끊어졌습니다',
  'notify.helperStarted': 'MU 헬퍼를 시작했습니다',
  'notify.helperStopped': 'MU 헬퍼를 멈췄습니다',
  'notify.helperSafeZone': '안전 지대에서는 MU 헬퍼를 시작할 수 없습니다',
  'notify.helperCost': 'MU 헬퍼가 {total} 젠을 소모했습니다',
  'notify.zenCap': '젠은 2,000,000,000을 넘겨 지닐 수 없습니다',
  'notify.cannotSell': '이 아이템은 팔 수 없습니다',
  'notify.merchantRefuses': '상인이 그 아이템을 받지 않습니다',
  'notify.learnedSkill': '{name}을(를) 배웠습니다',
  'notify.storageOpen': '창고가 열려 있는 동안에는 아이템을 쓸 수 없습니다',
  'notify.upgradeNeedsServer': '강화에는 서버가 필요합니다',
  'notify.noAnswerRestored': '서버가 응답하지 않아 아이템을 되돌렸습니다',
  'notify.cannotBuy': '그 아이템은 살 수 없습니다',
  'notify.updateAvailable': '새 버전이 나왔습니다. 월드를 나가면 페이지를 새로 고칩니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
