/** Chinese text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': '此世界列出了一个无法读取的模块（{id}）：已跳过',
  'moduleStream.api': '模块 {id} 需要模块 API {range}，此客户端提供 {have}：已跳过',
  'moduleStream.download': '无法下载模块 {id}：已跳过',
  'moduleStream.hash': '模块 {id} 与其哈希不符：已跳过',
  'moduleStream.core': '模块 {id} 自称核心模块：已拒绝',
  'moduleStream.builtIn': '模块 {id} 与内置模块同名：已拒绝',
  'moduleStream.declined': '模块 {id} 未获允许：已跳过',
  'moduleStream.failed': '模块 {id} 启动失败：已卸载',
} satisfies Partial<Record<keyof typeof en, string>>;
