/** Japanese text of the `social_prompts` window. */

import type en from './en';

export default {
  'social.partyInvite': '{name} がパーティーに招待しています。',
  'social.guildJoin': '{name} がギルドへの加入を希望しています。',
  'social.guildWar': '{name} があなたのギルドに宣戦布告しました。',
  'social.battleSoccer': '{name} があなたのギルドにバトルサッカーを挑みました。',
  'social.allianceOffer': '{name} がギルド同盟を申し出ています。',
  'social.allianceLeave': '{name} がギルド同盟からの脱退を望んでいます。',
  'social.hostilityDeclare': '{name} が両ギルドの敵対を宣言しました。',
  'social.hostilityEnd': '{name} が敵対関係の解消を望んでいます。',
  'social.friendRequest': '{name} があなたをフレンドに追加したがっています。',
} satisfies Partial<Record<keyof typeof en, string>>;
