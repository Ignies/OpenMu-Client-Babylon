/** Korean text of the `skill_tooltip` UI component. */

import type en from './en';

export default {
  'skills.tooltip.unknown': '알 수 없는 스킬',
  'skills.tooltip.class': '이 직업은 사용할 수 없습니다',
  'skills.tooltip.weapon': '해당 스킬이 붙은 무기가 필요합니다',
  'skills.tooltip.cooldown': '아직 사용할 수 없습니다',
  'skills.tooltip.level': '레벨 {level} 필요',
  'skills.tooltip.energy': '에너지 {energy} 필요',
  'skills.tooltip.mana': '마나가 부족합니다 ({mana})',
  'skills.tooltip.ag': 'AG가 부족합니다 ({ag})',
  'skills.tooltip.safezone': '안전 지대에서는 사용할 수 없습니다',
  'skills.unnamed': '스킬 #{number}',
  'skills.named': '{name} (Lv.{level})',
  'skills.damage': '스킬 공격력 +{value}',
  'skills.distance': '거리: {value}',
  'skills.mana': '마나: {value}',
  'skills.ag': 'AG: {value}',
  'skills.readyIn': '{seconds}초 후 사용 가능',
  'skills.delay': '딜레이: {seconds}초',
} satisfies Partial<Record<keyof typeof en, string>>;
