/** Japanese text of the `skill_tooltip` interface widget. */

import type en from './en';

export default {
  'skills.tooltip.unknown': '不明なスキル',
  'skills.tooltip.class': 'この職業では使用できません',
  'skills.tooltip.weapon': 'そのスキルを持つ武器が必要です',
  'skills.tooltip.cooldown': 'まだ使用できません',
  'skills.tooltip.level': 'レベル {level} が必要です',
  'skills.tooltip.energy': 'エネルギー {energy} が必要です',
  'skills.tooltip.mana': 'MP が足りません（{mana}）',
  'skills.tooltip.ag': 'AG が足りません（{ag}）',
  'skills.tooltip.safezone': '安全地帯では使用できません',
  'skills.unnamed': 'スキル #{number}',
  'skills.named': '{name}（Lv.{level}）',
  'skills.damage': 'スキルダメージ +{value}',
  'skills.distance': '射程：{value}',
  'skills.mana': 'MP：{value}',
  'skills.ag': 'AG：{value}',
  'skills.readyIn': 'あと {seconds} 秒',
  'skills.delay': 'ディレイ：{seconds} 秒',
} satisfies Partial<Record<keyof typeof en, string>>;
