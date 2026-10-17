/** zh-Hant text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': '此世界列出了一個無法讀取的模組（{id}）：已略過',
  'moduleStream.api': '模組 {id} 需要模組 API {range}，此用戶端提供 {have}：已略過',
  'moduleStream.download': '無法下載模組 {id}：已略過',
  'moduleStream.hash': '模組 {id} 與雜湊值不符：已略過',
  'moduleStream.core': '模組 {id} 自稱核心模組：已拒絕',
  'moduleStream.builtIn': '模組 {id} 與內建模組同名：已拒絕',
  'moduleStream.declined': '模組 {id} 未獲允許：已略過',
  'moduleStream.failed': '模組 {id} 啟動失敗：已卸載',
} satisfies Partial<Record<keyof typeof en, string>>;
