/** Chinese text of the `project_credits` window. */

import type en from './en';

export default {
  'projectCredits.title': '制作名单',
  'projectCredits.thanks': '特别鸣谢',
  'projectCredits.thanksNote': '本客户端所依托的项目与人员。',
  'projectCredits.contributors': '贡献者',
  'projectCredits.playtesters': '游戏测试',
  'projectCredits.reporters': '错误报告',
  'projectCredits.everyoneHeading': '以及',
  'projectCredits.everyone': '所有做出贡献的人',
  'projectCredits.commits': '{count} 次提交',
  'projectCredits.reports': '{count} 份报告',
  'projectCredits.owners': 'MU Online 及其原版客户端与游戏数据：Webzen。',
  'projectCredits.season6': 'Season 6 原版制作名单在服务器列表的 Credit 按钮中。',
  'projectCredits.loading': '正在读取制作名单...',
} satisfies Partial<Record<keyof typeof en, string>>;
