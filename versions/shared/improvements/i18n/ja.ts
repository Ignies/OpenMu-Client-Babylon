/** Japanese text of the improvements. */

import type en from './en';

export default {
  'fidelity.otherPlayersOwnSpeed': '他プレイヤーは自分の速度で',
  'fidelity.otherPlayersOwnSpeed.hint':
    '他のプレイヤーは自分の攻撃速度と魔法速度で攻撃・詠唱します。クラシック: オリジナル通り、全員があなたの速度で動きます。',
  'fidelity.masterBuffCancel': 'マスターバフは解除で消える',
  'fidelity.masterBuffCancel.hint':
    'マスターやレイジファイターのバフは、サーバーが解除した時点で消えます。クラシック: 効果時間が切れるまで残ります。',
  'fidelity.archangelFeathers': '大天使の羽根',
  'fidelity.archangelFeathers.hint':
    'ブラッドキャッスルの大天使が羽根を散らし、足元の光が広くなります。クラシック: オリジナルの小さな光のみで、羽根はありません。',
  'fidelity.loginChandeliers': 'ログイン画面のシャンデリア点灯',
  'fidelity.loginChandeliers.hint':
    'ログイン画面のシャンデリアに火がともります。クラシック: オリジナル通り消えたままです。',
  'fidelity.wingShadows': '翼の影',
  'fidelity.wingShadows.hint':
    '翼が影を落とします。クラシック: オリジナル通り影はありません。',
  'fidelity.torchCrackle': 'たいまつの音',
  'fidelity.torchCrackle.hint':
    '近くの燃えるたいまつがパチパチと鳴ります。クラシック: たいまつは無音です。',
} satisfies Partial<Record<keyof typeof en, string>>;
