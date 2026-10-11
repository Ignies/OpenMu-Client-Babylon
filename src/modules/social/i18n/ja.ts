/** Japanese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'パーティから抜けました。',
  'party.onlyLeaderInvites': '招待できるのはパーティリーダーだけです。',
  'party.full': 'パーティが満員です。',
  'party.invitationSent': '{name} にパーティ招待を送りました。',
  'party.reply.on': 'パーティー招待: 確認します。',
  'party.reply.off': 'パーティー招待: 自動で断ります。確認に戻すには /re on。',
  'party.reply.auto': 'パーティー招待: 自動で受けます。確認に戻すには /re on。',
  'party.reply.status': 'パーティー招待: /re {mode}。/re on、/re off、/re auto で変更できます。',
  'party.reply.declined': '{name} からのパーティー招待を断りました (/re)。',
  'party.reply.accepted': '{name} からのパーティー招待を受けました (/re)。',
  'guild.joinRequestSent': '{name} にギルド加入申請を送りました。',
  'guild.onlyMasterAppoints': 'メンバーを任命できるのはギルドマスターだけです。',
  'guild.onlyMasterCan': 'これができるのはギルドマスターだけです。',
  'guild.allianceRequestSent': '{name} に同盟申請を送りました。',
  'guild.hostilityRequestSent': '{name} に敵対宣言を送りました。',
} satisfies Partial<Record<keyof typeof en, string>>;
