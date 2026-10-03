/** Korean text of the `items` module. */

import type en from './en';

export default {
  'options.compare.shift': 'Shift 누를 때',
  'options.compare.always': '항상',
  'item.ringOfGlory': '영광의 반지',
  'item.darkStone': '다크 스톤',
  'item.starOfSacredBirth': '성탄의 별',
  'item.firecracker': '폭죽',
  'item.heartOfLove': '사랑의 하트',
  'item.silverMedal': '은메달',
  'item.goldMedal': '금메달',
  'item.boxOfHeaven': '하늘의 상자',
  'item.boxOfKundun': '쿤둔의 상자',
  'item.heartOfDarkLord': '다크 로드의 마음',
  'item.blueLuckyPouch': '파란 복주머니',
  'item.redLuckyPouch': '빨간 복주머니',
  'item.absoluteStaffOfArchangel': '대천사의 절대 지팡이',
  'item.absoluteSwordOfArchangel': '대천사의 절대 검',
  'item.absoluteCrossbowOfArchangel': '대천사의 절대 석궁',
} satisfies Partial<Record<keyof typeof en, string>>;
