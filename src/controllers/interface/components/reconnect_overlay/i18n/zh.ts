/** Chinese text of the `reconnect_overlay` interface widget. */

import type en from './en';

export default {
  'resume.title': '连接已断开',
  'resume.connecting': '正在重新连接...（第 {attempt} 次）',
  'resume.loggingIn': '正在重新登录...',
  'resume.selecting': '正在进入游戏...',
  'resume.cancel': '取消',
} satisfies Partial<Record<keyof typeof en, string>>;
