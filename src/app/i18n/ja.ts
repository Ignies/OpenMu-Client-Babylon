/** Japanese text of the app shell (`src/app`). */

import type en from './en';

export default {
  'notify.wsError': 'WebSocket の接続エラー',
  'notify.connectionLost': 'サーバーとの接続が切れました',
  'notify.serverListLost': 'サーバー一覧との接続が切れました',
  'notify.helperStarted': 'MU ヘルパーを開始しました',
  'notify.helperStopped': 'MU ヘルパーを停止しました',
  'notify.helperSafeZone': '安全地帯では MU ヘルパーを開始できません',
  'notify.helperCost': 'MU ヘルパーが {total} Zen を消費しました',
  'notify.zenCap': 'Zen は 2,000,000,000 を超えて持てません',
  'notify.cannotSell': 'このアイテムは売却できません',
  'notify.merchantRefuses': '商人はそのアイテムを受け取りません',
  'notify.learnedSkill': '{name} を習得しました',
  'notify.storageOpen': '倉庫を開いている間はアイテムを使えません',
  'notify.upgradeNeedsServer': '強化にはサーバーが必要です',
  'notify.noAnswerRestored': 'サーバーが応答しませんでした - アイテムを戻しました',
  'notify.cannotBuy': 'そのアイテムは購入できません',
  'notify.updateAvailable': '新しいバージョンがあります。ワールドを出るとページを再読み込みします。',
} satisfies Partial<Record<keyof typeof en, string>>;
