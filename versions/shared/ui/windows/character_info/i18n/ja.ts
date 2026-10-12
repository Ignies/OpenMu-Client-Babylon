/** Japanese text of the `character_info` window. */

import type en from './en';

export default {
  'stat.short.strength': '力',
  'stat.short.agility': '敏',
  'stat.short.vitality': '体',
  'stat.short.energy': 'エ',

  'charInfo.dmgRate': 'ダメージ（命中）：{min}~{max}（{rate}）',
  'charInfo.dmg': 'ダメージ：{min}~{max}',
  'charInfo.attackRate': '攻撃成功率：{value}',
  'charInfo.defenseRateFull': '防御（成功率）：{defense}（{rate} +{bonus}）',
  'charInfo.defenseRate': '防御（成功率）：{defense}（{rate}）',
  'charInfo.defenseFull': '防御：{defense}（+{bonus}）',
  'charInfo.defense': '防御：{defense}',
  'charInfo.defenseRatePvp': '防御成功率：{value}',
  'charInfo.hp': 'HP：{current} / {max}',
  'charInfo.meleeDamage': '近接ダメージ：{value}%',
  'charInfo.mana': 'MP：{current} / {max}',
  'charInfo.wizardryRate': '魔法ダメージ：{min}~{max}（+{rate}）',
  'charInfo.wizardry': '魔法ダメージ：{min}~{max}',
  'charInfo.curseSpell': ' 呪い：{min}～{max}',
  'charInfo.curseSpellRate': ' 呪い：{min}～{max}(+{rate})',
  'charInfo.skillDamage': 'スキルダメージ：{value}%',
  'charInfo.divineDamage': '神聖ダメージ（Roar・Slasher）：{value}%',
  'charInfo.aoeDamage': '範囲ダメージ（Dark Side）：{value}%',
  'charInfo.addAmount': '追加するポイント数',
  'charInfo.stopAdding': '停止',

  'characterInfo.title': 'キャラクター',
  'characterInfo.close': '閉じる（C）',
  'characterInfo.quest': 'クエスト（T）',
  'characterInfo.pet': 'ペット',
  'characterInfo.masterTree': 'マスタースキルツリー（A）',
} satisfies Partial<Record<keyof typeof en, string>>;
