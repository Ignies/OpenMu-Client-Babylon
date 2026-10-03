/** Korean text of several modules (no single owner). */

import type en from './en';

export default {
  'personalShop.needLevel': '개인 상점은 레벨 6이 필요합니다.',
  'personalShop.openFailed': '상점을 열 수 없습니다.',
  'personalShop.cannotSell': '이 아이템은 상점에서 팔 수 없습니다.',
  'personalShop.itemGone': '그 아이템은 이미 없습니다.',
  'guild.alreadyInGuild': '이미 길드에 속해 있습니다.',
  'guild.notGuildMaster': '그 플레이어는 길드 마스터가 아닙니다.',
  'guild.requestFailed': '길드 요청에 실패했습니다.',
  'quest.itemFallback': '아이템 {id}',
  'event.shortOfZen': '젠이 부족합니다.',
  'notify.negativePrice': '가격은 음수가 될 수 없습니다',
} satisfies Partial<Record<keyof typeof en, string>>;
