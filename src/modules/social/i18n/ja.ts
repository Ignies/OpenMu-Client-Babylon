/** Japanese text of the `social` module. */

import type en from './en';

export default {
  'party.left': 'パーティから抜けました。',
  'party.onlyLeaderInvites': '招待できるのはパーティリーダーだけです。',
  'party.full': 'パーティが満員です。',
  'party.invitationSent': '{name} にパーティ招待を送りました。',
  'guild.joinRequestSent': '{name} にギルド加入申請を送りました。',
  'guild.onlyMasterAppoints': 'メンバーを任命できるのはギルドマスターだけです。',
  'guild.onlyMasterCan': 'これができるのはギルドマスターだけです。',
  'guild.allianceRequestSent': '{name} に同盟申請を送りました。',
  'guild.hostilityRequestSent': '{name} に敵対宣言を送りました。',
} satisfies Partial<Record<keyof typeof en, string>>;
