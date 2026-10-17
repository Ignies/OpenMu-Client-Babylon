/** zh-Hant text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': '請先關閉合成視窗再離開遊戲。',
  'exit.noAnswer': '伺服器沒有回應，仍將離開。',
  'resume.done': '已重新連線',
  'resume.failed': '無法重新連線',
  'resume.cancelled': '已取消重新連線',
  'login.closingOldSession': '帳號仍在線上：正在關閉舊的連線並重試……',
  'login.tokenRefused': '已儲存的登入資訊已過期，請輸入密碼。',
  'login.tokenUnanswered': '伺服器沒有回應已儲存的登入資訊，請輸入密碼。',
} satisfies Partial<Record<keyof typeof en, string>>;
