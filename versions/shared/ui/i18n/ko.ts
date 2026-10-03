/** Korean text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': '서버 목록을 불러오는 중...',
  'servers.serverName': '서버 {number}',
  'login.id': 'ID',
  'login.password': '비밀번호',

  'options.title': '옵션',
  'options.texturePack': '모델 텍스처',
  'options.texturePack.original': '원본',
  'options.texturePackHint': '고해상도 모델 텍스처. 다시 불러오지 않고 적용됩니다',
  'session.toLevel': '레벨까지',
  'bottomBar.pet.normalTip': '기본: 까마귀가 곁에 머무릅니다',
  'bottomBar.pet.randomTip': '무작위: 주변의 대상을 공격합니다',
  'bottomBar.pet.ownerTip': '주인: 내가 공격하는 대상을 공격합니다',
  'bottomBar.pet.targetTip': '대상: 현재 대상을 공격합니다',

  'skills.title': '스킬',
  'skills.empty': '배운 스킬이 없습니다',
  'chatRoom.leave': '나가기',
  'command.trade': '거래',
  'command.purchase': '구매',
  'command.party': '파티',
  'command.whisper': '귓속말',
  'command.follow': '따라가기',
  'command.battle': '결투',
  'warp.title': '이동 명령 창',
  'instrument.putAway': '집어넣기',
  'prompt.trade': '거래',
} satisfies Partial<Record<keyof typeof en, string>>;
