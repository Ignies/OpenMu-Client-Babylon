/** Japanese text of the `pet_info` window. */

import type en from './en';

export default {
  'petInfo.title': 'ペット',
  'petInfo.darkHorse': 'ダークホース',
  'petInfo.darkRaven': 'ダークレイブン',
  'petInfo.notEquipped': '{pet}を装備していません。',
  'petInfo.waiting': 'ペット情報を待っています...',
  'petInfo.level': 'レベル {level}',
  'petInfo.life': 'ライフ {current} / {max}',
  'petInfo.exp': '経験値 {current} / {next}',
  'petInfo.damage': 'ダメージ {min}~{max}（確率 {rate}）',
  'petInfo.attackSpeed': '攻撃速度 {speed}',
  'petInfo.defense': '防御力 {defense}',
  'petInfo.command': '命令',
  'petInfo.cmdNormal': '通常攻撃',
  'petInfo.cmdRandom': 'ランダム攻撃',
  'petInfo.cmdOwner': '主人と一緒に攻撃',
  'petInfo.cmdTarget': '指定した対象を攻撃',
} satisfies Partial<Record<keyof typeof en, string>>;
