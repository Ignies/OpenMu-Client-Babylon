/** Japanese text of the `bottom_bar` HUD element. */

import type en from './en';

export default {
  'bottomBar.itemShop': 'アイテムショップ',
  'bottomBar.characterInfo': 'キャラクター情報',
  'bottomBar.inventory': 'インベントリ',
  'bottomBar.friendList': 'フレンドリスト',
  'bottomBar.options': 'オプション',
  'bottomBar.noSkill': 'スキルなし（右クリック＝通常攻撃）',
  'bottomBar.emptySlot': '[{key}] 空き',
  'bottomBar.itemSlot': '{name} [{key}]',
  'bottomBar.skillHint': ' - クリック：スキル一覧、右クリック：通常攻撃',
  'bottomBar.pickSkill': '[{key}] 空き - クリックしてスキルを選択',
  'bottomBar.boundSlot': '{name} [{key}] - 右クリックで変更',
  'bottomBar.clearSlot': 'スロット [{key}] を空にする',
  'bottomBar.pet.normal': '通常',
  'bottomBar.pet.random': 'ランダム',
  'bottomBar.pet.owner': '主人',
  'bottomBar.pet.target': 'ターゲット',
  'bottomBar.pet.needTarget': '先にカラスの対象を選んでください',
  'exp.title': '経験値',
} satisfies Partial<Record<keyof typeof en, string>>;
