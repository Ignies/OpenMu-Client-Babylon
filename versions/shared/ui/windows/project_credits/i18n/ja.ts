/** Japanese text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': 'クレジット',
  'projectCredits.thanks': 'スペシャルサンクス',
  'projectCredits.thanksNote': 'このクライアントの基盤となったプロジェクトと人々。',
  'projectCredits.contributors': 'コントリビューター',
  'projectCredits.playtesters': 'テストプレイ',
  'projectCredits.reporters': 'バグ報告',
  'projectCredits.everyoneHeading': 'そして',
  'projectCredits.everyone': '協力してくれたすべての人',
  'projectCredits.commits': 'コミット {count}',
  'projectCredits.reports': '報告 {count}',
  'projectCredits.owners': 'MU Online、オリジナルのクライアントとゲームデータ: Webzen。',
  'projectCredits.season6': 'Season 6 のオリジナルのスタッフロールはサーバー一覧の Credit ボタンです。',
  'projectCredits.loading': 'クレジットを読み込み中...',
} satisfies Partial<Record<keyof typeof en, string>>;
