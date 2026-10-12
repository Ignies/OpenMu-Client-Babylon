/** Chinese text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': '力',
  'stat.short.agility': '敏',
  'stat.short.vitality': '体',
  'stat.short.energy': '能',

  'charInfo.dmgRate': '伤害（命中）：{min}~{max}（{rate}）',
  'charInfo.dmg': '伤害：{min}~{max}',
  'charInfo.attackRate': '攻击成功率：{value}',
  'charInfo.defenseRateFull': '防御（成功率）：{defense}（{rate} +{bonus}）',
  'charInfo.defenseRate': '防御（成功率）：{defense}（{rate}）',
  'charInfo.defenseFull': '防御：{defense}（+{bonus}）',
  'charInfo.defense': '防御：{defense}',
  'charInfo.defenseRatePvp': '防御成功率：{value}',
  'charInfo.hp': '生命：{current} / {max}',
  'charInfo.meleeDamage': '近战伤害：{value}%',
  'charInfo.mana': '魔力：{current} / {max}',
  'charInfo.wizardryRate': '魔法伤害：{min}~{max}（+{rate}）',
  'charInfo.wizardry': '魔法伤害：{min}~{max}',
  'charInfo.curseSpell': ' 诅咒伤害：{min} ~ {max}',
  'charInfo.curseSpellRate': ' 诅咒伤害：{min} ~ {max}（+{rate}）',
  'charInfo.skillDamage': '技能伤害：{value}%',
  'charInfo.divineDamage': '神圣伤害（怒吼、斩击）：{value}%',
  'charInfo.aoeDamage': '范围伤害（暗黑之力）：{value}%',
  'charInfo.addAmount': '要加的点数',
  'charInfo.stopAdding': '停止',

  'characterInfo.title': '角色',
  'characterInfo.close': '关闭（C）',
  'characterInfo.quest': '任务（T）',
  'characterInfo.pet': '宠物',
  'characterInfo.masterTree': '大师技能树（A）',
} satisfies Partial<Record<keyof typeof en, string>>;
