/** Japanese text of the `guild` module. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} がギルドを抜けました。',
  'guild.youLeft': 'ギルドを抜けました。',
  'guild.disbanded': 'ギルドが解散しました。',
  'guild.memberRemoved': 'メンバーをギルドから除名しました。',
  'guild.onlyMasterRemoves': 'メンバーを除名できるのはギルドマスターだけです。',
  'guild.wrongPassword': '入力したパスワードが違います。',
  'guild.created': 'ギルドを創設しました。',
  'guild.nameTaken': 'そのギルド名はすでに使われています。',
  'guild.createFailed': 'ギルドを創設できませんでした。',
  'guild.joinRefused': 'ギルドマスターに申請を断られました。',
  'guild.joined': 'ギルドに加入しました。',
  'guild.isFull': 'ギルドが満員です。',
  'guild.masterUnavailable': 'ギルドマスターが応じられません。',
  'guild.masterBusy': 'ギルドマスターは取り込み中です。後でお試しください。',
  'guild.needLevel6': 'ギルドに入るにはレベル 6 以上が必要です。',
} satisfies Partial<Record<keyof typeof en, string>>;
