/** Chinese text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': '其他玩家按自身速度',
  'fidelity.otherPlayersOwnSpeed.hint':
    '其他玩家以自己的攻击速度和魔法速度攻击和施法。经典：与原版一样，所有人都按你的速度行动。',
  'fidelity.masterBuffCancel': '大师增益在取消时结束',
  'fidelity.masterBuffCancel.hint':
    '大师或格斗家的增益在服务器取消时立即消失。经典：保持到计时结束。',
  'fidelity.archangelFeathers': '大天使羽毛',
  'fidelity.archangelFeathers.hint':
    '血色城堡的大天使会飘落羽毛，地面光晕更大。经典：原版的小光晕，没有羽毛。',
  'fidelity.loginChandeliers': '登录画面吊灯点亮',
  'fidelity.loginChandeliers.hint':
    '登录画面的吊灯会燃烧。经典：与原版一样是熄灭的。',
  'fidelity.torchCrackle': '火把声音',
  'fidelity.torchCrackle.hint':
    '靠近燃烧的火把时会听到噼啪声。经典：火把没有声音。',
  'fidelity.loginWallTorches': '登录画面壁挂火把点亮',
  'fidelity.loginWallTorches.hint':
    '登录画面的壁挂火把会燃烧并照亮地面。经典：与原版一样只有光晕。',
  'fidelity.fortressLights': '帝国要塞的灯光',
  'fidelity.fortressLights.hint':
    '帝国要塞的壁挂火把、吊灯和火盆会照亮周围的地面。经典：与原版一样没有灯光。',
  'fidelity.lampFlares': '灯光与光晕',
  'fidelity.lampFlares.hint':
    '路灯、蜡烛、壁炉和火盆会发出光晕，蜡烛会燃烧，部分灯和火焰会照亮周围的地面。经典：只有原版绘制的内容。',
  'fidelity.roofFade': '透明屋顶',
  'fidelity.roofFade.hint':
    '站在屋顶下时屋顶会淡出，让你看到室内。经典：屋顶始终显示。',
  'fidelity.requestTimeout': '请求20秒后过期',
  'fidelity.requestTimeout.hint':
    '未回应的交易、组队或决斗请求会在20秒后被拒绝。经典：一直等到你回应。',
  'fidelity.noticeLinks': '服务器公告中的链接',
  'fidelity.noticeLinks.hint':
    '服务器公告中的网址显示为带下划线的链接，在新标签页中打开。经典：与原版相同的纯文本。',
  'fidelity.cameraKeepsView': '传送后保持镜头',
  'fidelity.cameraKeepsView.hint':
    '传送或切换地图时，镜头的缩放、旋转和倾斜保持不变；视角被移动时会显示“重置镜头”按钮。经典：与原版相同，每次切换地图都会重置镜头。',
} satisfies Partial<Record<keyof typeof en, string>>;
