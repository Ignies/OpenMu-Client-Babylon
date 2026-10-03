/** Japanese text of several windows, HUD elements and pages (no single owner). */

import type en from './en';

export default {
  'servers.loading': 'サーバー一覧を読み込んでいます...',
  'servers.serverName': 'サーバー {number}',
  'login.id': 'ID',
  'login.password': 'パスワード',

  'options.title': 'オプション',
  'options.texturePack': 'モデルテクスチャ',
  'options.texturePack.original': 'オリジナル',
  'options.texturePackHint': '高解像度のモデルテクスチャ。再読み込みなしで適用されます',
  'session.toLevel': 'レベルまで',
  'bottomBar.pet.normalTip': '通常：カラスはそばに留まります',
  'bottomBar.pet.randomTip': 'ランダム：近くの相手を攻撃します',
  'bottomBar.pet.ownerTip': '主人：あなたが攻撃した相手を攻撃します',
  'bottomBar.pet.targetTip': 'ターゲット：現在の対象を攻撃します',

  'skills.title': 'スキル',
  'skills.empty': '習得したスキルはありません',
  'chatRoom.leave': '退出',
  'command.trade': '取引',
  'command.purchase': '購入',
  'command.party': 'パーティー',
  'command.whisper': 'ささやき',
  'command.follow': '追従',
  'command.battle': '決闘',
  'warp.title': '移動コマンドウィンドウ',
  'instrument.putAway': 'しまう',
  'prompt.trade': '取引',
} satisfies Partial<Record<keyof typeof en, string>>;
