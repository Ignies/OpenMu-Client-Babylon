/** Chinese text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': '未知技能',
  'skills.tooltip.class': '你的职业无法使用',
  'skills.tooltip.weapon': '需要携带对应武器',
  'skills.tooltip.cooldown': '尚未冷却完毕',
  'skills.tooltip.level': '需要等级 {level}',
  'skills.tooltip.energy': '需要能量 {energy}',
  'skills.tooltip.mana': '魔力不足（{mana}）',
  'skills.tooltip.ag': 'AG 不足（{ag}）',
  'skills.tooltip.safezone': '安全区内无法使用',
  'skills.unnamed': '技能 #{number}',
  'skills.named': '{name}（{level} 级）',
  'skills.damage': '技能伤害 +{value}',
  'skills.distance': '距离：{value}',
  'skills.mana': '魔力：{value}',
  'skills.ag': 'AG：{value}',
  'skills.readyIn': '{seconds} 秒后就绪',
  'skills.delay': '冷却：{seconds} 秒',
} satisfies Partial<Record<keyof typeof en, string>>;
