/** Japanese text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': 'このワールドに読み込めないモジュールがあります（{id}）：スキップしました',
  'moduleStream.api': 'モジュール {id} にはモジュールAPI {range} が必要ですが、このクライアントは {have} です：スキップしました',
  'moduleStream.download': 'モジュール {id} をダウンロードできませんでした：スキップしました',
  'moduleStream.hash': 'モジュール {id} がハッシュと一致しません：スキップしました',
  'moduleStream.core': 'モジュール {id} はコアモジュールを名乗っています：拒否しました',
  'moduleStream.builtIn': 'モジュール {id} は組み込みモジュールと同じ名前です：拒否しました',
  'moduleStream.declined': 'モジュール {id} は許可されませんでした：スキップしました',
  'moduleStream.failed': 'モジュール {id} の起動に失敗しました：解除しました',
} satisfies Partial<Record<keyof typeof en, string>>;
