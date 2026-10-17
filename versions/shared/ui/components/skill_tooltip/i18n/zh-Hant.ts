/** zh-Hant text of `versions/shared/ui/components/skill_tooltip`. */

import type en from './en';

export default {
  'skills.tooltip.unknown': '未知技能',
  'skills.tooltip.class': '你的職業無法使用',
  'skills.tooltip.weapon': '需要裝備附帶此技能的武器',
  'skills.tooltip.cooldown': '尚未準備好',
  'skills.tooltip.level': '需要等級{level}',
  'skills.tooltip.energy': '需要智力{energy}',
  'skills.tooltip.mana': '魔力不足（{mana}）',
  'skills.tooltip.ag': 'AG 不足（{ag}）',
  'skills.tooltip.safezone': '安全區內無法使用',
  'skills.unnamed': '技能 #{number}',
  'skills.named': '{name}（Lv.{level}）',
  'skills.damage': '技能攻擊力 +{value}',
  'skills.distance': '距離：{value}',
  'skills.mana': '魔力：{value}',
  'skills.ag': 'AG：{value}',
  'skills.readyIn': '{seconds}秒後可使用',
  'skills.delay': '冷卻時間：{seconds}秒',
} satisfies Partial<Record<keyof typeof en, string>>;
