/** Chinese text of the `auto_download` UI component. */

import type en from './en';

export default {
  'autoDownload.title': '正在下载游戏数据',
  'autoDownload.done': '游戏数据已下载',
  'autoDownload.cancel': '取消',
  'autoDownload.hide': '隐藏（继续下载）',
  'autoDownload.phase.map': '正在加载地图：{name}',
  'autoDownload.phase.icons': '正在加载物品',
  'autoDownload.phase.audio': '正在加载音乐和音效',
  'autoDownload.phase.monsters': '正在加载角色和怪物',
  'autoDownload.phase.core': '正在加载界面和特效',
  'autoDownload.left': '剩余 {left} MB',
  'autoDownload.received': '已下载 {got} MB，共 {total} MB',
  'autoDownload.screenTitle': '正在准备你的冒险',
  'autoDownload.screenText': '保存这些文件，下次游戏加载更快。只在第一次。',
  'autoDownload.skip': '直接进入',
  'autoDownload.skipNote': '下载会在后台继续。关闭游戏后，会从中断处继续。',
} satisfies Partial<Record<keyof typeof en, string>>;
