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
  'fidelity.torchCrackle': 'たいまつの音',
  'fidelity.torchCrackle.hint':
    '近くの燃えるたいまつがパチパチと鳴ります。クラシック: たいまつは無音です。',
  'fidelity.loginWallTorches': 'ログイン画面の壁たいまつ点灯',
  'fidelity.loginWallTorches.hint':
    'ログイン画面の壁たいまつが炎を上げ、床を照らします。クラシック: オリジナル通り光の輝きだけです。',
  'fidelity.fortressLights': '帝国要塞の明かり',
  'fidelity.fortressLights.hint':
    '帝国要塞の壁たいまつ、シャンデリア、かがり火が周りの床を照らします。クラシック: オリジナル通り明かりはありません。',
  'fidelity.lampFlares': 'ランプの明かりと輝き',
  'fidelity.lampFlares.hint':
    '街灯、ろうそく、暖炉、かがり火が光の輝きを放ち、ろうそくが燃え、一部のランプや炎が周りの地面を照らします。クラシック: オリジナルが描くものだけです。',
  'fidelity.roofFade': '透ける屋根',
  'fidelity.roofFade.hint':
    '屋根の下に立つと屋根が消え、中が見えます。クラシック: 屋根は常に表示されます。',
  'fidelity.requestTimeout': '申請は20秒で期限切れ',
  'fidelity.requestTimeout.hint':
    '放置した取引・パーティー・決闘の申請は20秒後に断られます。クラシック: 答えるまで待ちます。',
  'fidelity.noticeLinks': 'サーバー告知のリンク',
  'fidelity.noticeLinks.hint':
    'サーバー告知のWebアドレスが下線付きリンクになり、新しいタブで開きます。クラシック: オリジナル通りのただの文字。',
  'fidelity.cameraKeepsView': 'ワープ後もカメラを維持',
  'fidelity.cameraKeepsView.hint':
    'ワープやマップ移動の後もカメラのズーム・回転・傾きがそのまま残り、視点を動かしている間は「カメラをリセット」ボタンが表示されます。クラシック: オリジナル通り、マップが変わるたびにカメラがリセットされます。',
  'fidelity.swingFill': '攻撃モーションが間を埋める',
  'fidelity.swingFill.hint':
    '攻撃速度が速いとき、命中後の攻撃モーションをゆっくり再生して次の攻撃まで続け、その間にキャラクターが止まらないようにします。命中のタイミングは変わりません。クラシック: オリジナル通り、モーションが早く終わってキャラクターは立ち止まります。',
  'fidelity.drawnClothShadows': '布の影を整理',
  'fidelity.drawnClothShadows.hint':
    'キャラクターが見せているマント、ローブ、髪だけが影を落とします。クラシック: 見えなくなった布も、残された場所に影を落とし続けます（オリジナルどおり）。',
  'fidelity.teleportLandsEarly': 'テレポートを即時に着地',
  'fidelity.teleportLandsEarly.hint':
    '自分のテレポートは、姿が消えた時点でサーバーの応答を待たずに目的のマスへ着地します。クラシック: サーバーが応答するまで元のマスで消えたまま待ちます（オリジナルどおり）。',
} satisfies Partial<Record<keyof typeof en, string>>;
