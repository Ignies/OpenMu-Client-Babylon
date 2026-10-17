/** zh-Hant text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': '正在下載遊戲資料',
  'autoDownload.done': '遊戲資料下載完成',
  'autoDownload.cancel': '取消',
  'autoDownload.hide': '隱藏（繼續下載）',
  'autoDownload.phase.map': '正在讀取地圖：{name}',
  'autoDownload.phase.icons': '正在讀取物品',
  'autoDownload.phase.audio': '正在讀取音樂與音效',
  'autoDownload.phase.monsters': '正在讀取角色與生物',
  'autoDownload.phase.core': '正在讀取介面與特效',
  'autoDownload.left': '剩餘 {left} MB',
  'autoDownload.received': '已下載 {got} MB / {total} MB',
  'autoDownload.screenTitle': '正在準備你的冒險',
  'autoDownload.screenText': '這些檔案會保留下來，讓下次遊戲讀取更快。只有第一次需要。',
  'autoDownload.skip': '直接進入',
  'autoDownload.skipNote': '下載會在背景繼續進行。關閉遊戲後，會從中斷的地方接續。',
} satisfies Partial<Record<keyof typeof en, string>>;
