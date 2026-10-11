/** Chinese text of the `session_stats` window. */

import type en from './en';

export default {
  'session.title': '本次游戏',
  'session.time': '时长',
  'session.exp': '经验',
  'session.kills': '击杀',
  'session.zen': 'Zen',
  'session.reset': '重置',
} satisfies Partial<Record<keyof typeof en, string>>;
