/** Chinese text of the `session` module. */

import type en from './en';

export default {
  'exit.chaosOpen': '请先关闭混沌合成窗口再退出游戏。',
  'exit.noAnswer': '服务器没有回应，仍然退出。',
  'resume.done': '已重新上线',
  'resume.failed': '无法重新连接',
  'resume.cancelled': '已取消重新连接',
  'login.closingOldSession': '账号仍在游戏中：正在关闭旧会话并重试...',
} satisfies Partial<Record<keyof typeof en, string>>;
