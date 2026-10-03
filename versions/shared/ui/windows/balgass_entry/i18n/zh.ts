/** Chinese text of the `balgass_entry` window. */

import type en from './en';

export default {
  'quest.werewolf.name': '狼人守卫',
  'quest.werewolf.line1': '“你了解我吗？我既受到卢加德的祝福，也受到他的诅咒。如果你有资格，我可以帮助你。”',
  'quest.werewolf.line2': '如果你通过了使徒德文的考验，狼人守卫会把你和你的队友送往巴尔加斯的兵营。',
  'quest.werewolf.line3': '你们必须站在一起，才能一同进入巴尔加斯的兵营。',
  'quest.werewolf.line4': '要得到狼人守卫的帮助，你必须支付 3,000,000 Zen。',
  'quest.gatekeeper.name': '守门人',
  'quest.gatekeeper.line1': '“嗯，你是谁？巴尔加斯批准过你吗？”',
  'quest.gatekeeper.line2': '卢加德的十二使徒正在帮忙，让通往巴尔加斯安息之地的守门人看不见你。',
  'quest.gatekeeper.line3': '执行使徒德文的第三个任务时，可以进入安息之地。',
} satisfies Partial<Record<keyof typeof en, string>>;
