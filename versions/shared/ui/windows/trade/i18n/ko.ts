/** Korean text of the `trade` window. */

import type en from './en';

export default {
  'trade.title': '거래',
  'trade.warnCheck': '수락하기 전에 아이템을 모두 확인하세요.',
  'trade.warnAlike': '겉모습이 같아도 다른 아이템일 수 있습니다.',
  'trade.warnCancel': '거래를 취소하면 모두 되돌려받습니다.',
  'trade.cancel': '거래 취소',
  'trade.offerZen': '젠 제시',
  'trade.accept': '거래 수락',
} satisfies Partial<Record<keyof typeof en, string>>;
