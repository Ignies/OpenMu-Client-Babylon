/** Korean text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': '개인 상점',
  'personalShop.button': '상점',
  'personalShop.selling': '상점이 열려 있습니다',
  'personalShop.namePlaceholder': '상점 이름',
  'personalShop.openTip': '상점 열기',
  'personalShop.closeTip': '상점 닫기',
  'personalShop.info1': '열기 전에 모든 아이템에 가격을 매기세요.',
  'personalShop.info2': '이동하거나 접속을 끊으면 상점이 닫힙니다.',
  'personalShop.info3': '구매자는 바로 옆에 서 있어야 합니다.',
  'personalShop.info4': '가격이 붙은 아이템은 사용하거나 버릴 수 없습니다.',
  'personalShop.info5': '젠은 인벤토리로 바로 들어옵니다.',
  'personalShop.warn1': '가치보다 싸게 팔지 마세요.',
  'personalShop.warn2': '가격의 최종 판단은 서버가 합니다.',
} satisfies Partial<Record<keyof typeof en, string>>;
