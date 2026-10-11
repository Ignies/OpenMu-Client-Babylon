/** Chinese text of no single owner: shared by many (`common.*`, language names). */

import type en from './en';

export default {
  'common.ok': '确定',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.none': '无',
  'common.create': '创建',
  'common.creating': '创建中...',
  'common.send': '发送',
  'common.sending': '发送中...',
  'common.loading': '加载中...',
  'common.warning': '注意',
  'common.level': '等级',
  'common.offline': '离线',
  'common.off': '关',
  'common.zen': '金币',
  'common.notEnoughZen': '金币不足',
  'options.quality.classic': '经典',
  'options.quality.enhanced': '增强',
} satisfies Partial<Record<keyof typeof en, string>>;
