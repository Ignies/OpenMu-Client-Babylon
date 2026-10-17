/** Korean text of the `economy_prompts` window. */

import type en from './en';

export default {
  'prompt.storeZen': '젠 맡기기',
  'prompt.takeZen': '젠 찾기',
  'prompt.unlockVault': '창고 잠금 해제',
  'prompt.enterPin': '창고 비밀번호를 입력하세요.',
  'prompt.setPin': '창고 비밀번호 설정',
  'prompt.removePin': '창고 비밀번호 삭제',
  'prompt.removePinHint': '비밀번호를 지우려면 계정 비밀번호가 필요합니다.',
  'prompt.offerZen': '젠 제시',
  'prompt.setPrice': '가격 설정',
  'prompt.askingPrice': '판매 가격.',
  'prompt.askingPriceFor': '{name}의 판매 가격.',
  'prompt.buy': '구매',
  'prompt.itemCosts': '{name}의 가격은 {price}입니다.',
  'prompt.thisItem': '이 아이템',
  'prompt.itemGone': '이 아이템은 이미 없습니다.',
  'prompt.buyHowMany': '{name} 을(를) 몇 개 살까요? 개당 {price}.',
  'prompt.quantity': '수량',
  'prompt.carrying': '소지 중인 금액은 {amount}입니다.',
  'prompt.vaultHolds': '창고에는 {amount}이(가) 있습니다.',
  'prompt.newPinHint': '새 비밀번호를 정하려면 계정 비밀번호가 필요합니다.',
  'prompt.pin': 'PIN',
  'prompt.password': '비밀번호',
  'prompt.wantsToTrade': '{name} 님이 거래를 원합니다.',
  'prompt.bundle': '묶기',
  'prompt.bundleAsk': '{name} {count}개를 묶으시겠습니까?',
  'prompt.unbundle': '풀기',
  'prompt.unbundleAsk': '{name} {count}개 묶음을 푸시겠습니까?',
} satisfies Partial<Record<keyof typeof en, string>>;
