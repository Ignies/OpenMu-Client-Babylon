import './style.less';
import { t } from '../../../../../i18n';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Social } from '../../../../../social';
import { Messenger } from '../../../../../messenger';
import { GuildRelationshipTypeEnum } from '../../../../../common/packets/ClientToServerPackets';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { TEXT_COLOR } from '../../../../pages/serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../../../../components/msgWindow/layout';

/** GlobalText 1295 / 1321 wording, by relationship and join/leave. */
function relationText(request: {
  senderName: string;
  relationship: GuildRelationshipTypeEnum;
  join: boolean;
}): string {
  const alliance = request.relationship === GuildRelationshipTypeEnum.Alliance;
  const name = request.senderName;
  if (alliance) {
    return request.join
      ? t('social.allianceOffer', { name })
      : t('social.allianceLeave', { name });
  }
  return request.join
    ? t('social.hostilityDeclare', { name })
    : t('social.hostilityEnd', { name });
}

/**
 * The yes/no boxes another player's request pops up: `CPartyMsgBoxLayout`,
 * `CGuildMsgBoxLayout`, `CGuildWar_MsgBoxLayout`
 * (NewUICommonMessageBox.cpp:1418), the guild alliance / hostility offer and
 * the friend request. Enter accepts, Escape refuses; only one box is up at a
 * time, in the order below.
 */
export const SocialPrompts = observer(() => {
  const party = Social.partyRequest;
  const guild = !party ? Social.guildJoinRequest : null;
  const war = !party && !guild ? Social.guildWarRequest : null;
  const relation = !party && !guild && !war ? Social.guildRelationRequest : null;
  const friend =
    !party && !guild && !war && !relation ? Messenger.friendRequest : null;

  const answer = (accepted: boolean) => {
    if (party) Social.partyRespond(accepted);
    else if (guild) Social.guildJoinRespond(accepted);
    else if (war) Social.guildWarRespond(accepted);
    else if (relation) Social.guildRelationRespond(accepted);
    else if (friend) Messenger.respondToFriendRequest(accepted);
  };

  const text = party
    ? t('social.partyInvite', { name: party.requesterName })
    : guild
      ? t('social.guildJoin', { name: guild.requesterName })
      : war
        ? war.soccer
          ? t('social.battleSoccer', { name: war.guildName })
          : t('social.guildWar', { name: war.guildName })
        : relation
          ? relationText(relation)
          : friend
            ? t('social.friendRequest', { name: friend.name })
            : '';

  useEffect(() => {
    if (!text) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') answer(true);
      else if (e.key === 'Escape') answer(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!text) return null;

  return (
    <div className="social-prompt-layer">
      <MuSpriteFrame
        file={BACK_SPRITE}
        width={WIN_WIDTH}
        height={WIN_HEIGHT}
        className="social-prompt"
      >
        <div className="social-prompt-text">{text}</div>
        <MuButton
          file={OK_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => answer(true)}
          style={{ position: 'absolute', left: BTN_BOTH_OK_X, top: BTN_Y }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => answer(false)}
          style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: BTN_Y }}
        />
      </MuSpriteFrame>
    </div>
  );
});
