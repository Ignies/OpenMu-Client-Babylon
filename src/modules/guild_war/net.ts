import { AllianceListPacket, GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum, GuildRelationshipChangeResultPacket, GuildRelationshipRequestPacket, GuildRelationshipRequestTypeEnum, GuildRelationshipTypeEnum, GuildSoccerScoreUpdatePacket, GuildSoccerTimeUpdatePacket, GuildWarDeclaredPacket, GuildWarEndedGuildWarResultEnum, GuildWarEndedPacket, GuildWarRequestPacket, GuildWarRequestResultPacket, GuildWarRequestResultRequestResultEnum, GuildWarScoreUpdatePacket, GuildWarTypeEnum, RemoveAllianceGuildResultPacket } from '@versions/shared/packets/ServerToClientPackets';
import { EventBus } from '@/core/eventBus';
import { Social } from '../social/social';
import { GuildMarks } from '@/modules/guild';
import { t, type TextKey } from '@/i18n';
import { cleanName } from '../chat/chat';
import { playerNameById } from '../_shared/net_helpers';
import { runInAction } from 'mobx';

const GUILD_WAR_RESULTS: Record<GuildWarRequestResultRequestResultEnum, TextKey> = {
  [GuildWarRequestResultRequestResultEnum.GuildNotFound]: 'guild.warNotFound',
  [GuildWarRequestResultRequestResultEnum.RequestSentToGuildMaster]:
    'guild.warRequestSent',
  [GuildWarRequestResultRequestResultEnum.GuildMasterOffline]: 'guild.warMasterOffline',
  [GuildWarRequestResultRequestResultEnum.NotInGuild]: 'guild.warNotInGuild',
  [GuildWarRequestResultRequestResultEnum.Failed]: 'guild.warRequestFailed',
  [GuildWarRequestResultRequestResultEnum.NotTheGuildMaster]: 'guild.warOnlyMaster',
  [GuildWarRequestResultRequestResultEnum.AlreadyInWar]: 'guild.warAlready',
};

const GUILD_WAR_ENDINGS: Record<GuildWarEndedGuildWarResultEnum, TextKey> = {
  [GuildWarEndedGuildWarResultEnum.Won]: 'guild.warWon',
  [GuildWarEndedGuildWarResultEnum.Lost]: 'guild.warLost',
  [GuildWarEndedGuildWarResultEnum.CancelledWar]: 'guild.warCancelled',
  [GuildWarEndedGuildWarResultEnum.OtherGuildMasterCancelledWar]:
    'guild.warCancelledByOther',
};

/** The failure reasons the original prints (GlobalText 1313 / 1326-1333). */
const RELATIONSHIP_ERRORS: Partial<
  Record<GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum, TextKey>
> = {
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.Failed]:
    'guild.relFailed',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildNotFound]:
    'guild.relNotFound',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NoAuthorization]:
    'guild.relNoAuthorization',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.AlreadyInAlliance]:
    'guild.relAlreadyAlliance',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.AlreadyInHostility]:
    'guild.relAlreadyHostile',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildAllianceExists]:
    'guild.relAllianceExists',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.HostileGuildExists]:
    'guild.relHostileExists',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.GuildAllianceDoesNotExist]:
    'guild.relNoAlliance',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.HostileGuildDoesNotExist]:
    'guild.relNoHostility',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NotMasterOfGuildAlliance]:
    'guild.relNotAllianceMaster',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.NotGuildRival]:
    'guild.relNotRival',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum
    .IncompleteRequirementsToCreateAlliance]: 'guild.relIncomplete',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum
    .MaximumNumberOfGuildsInAllianceReached]: 'guild.relAllianceFull',
  [GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.RequestCancelled]:
    'guild.relCancelled',
};

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // ---- guild war / alliance (`ReceiveGuildWar*`, `ReceiveUnion*`) -------------

  /**
   * GuildWarRequest (0x61): another guild master asks for a war. The original
   * puts up `CGuildWar_MsgBoxLayout` (NewUICommonMessageBox.cpp:1418) with the
   * Battle Soccer wording when `Type` is Soccer.
   */
  EventBus.on('GuildWarRequest', packet => {
    const p = new GuildWarRequestPacket(packet);
    runInAction(() => {
      Social.guildWarRequest = {
        guildName: cleanName(p.GuildName),
        soccer: p.Type === GuildWarTypeEnum.Soccer,
      };
    });
  });

  EventBus.on('GuildWarRequestResult', packet => {
    const p = new GuildWarRequestResultPacket(packet);
    const text = t(GUILD_WAR_RESULTS[p.Result] ?? 'guild.warRequestFailed');
    if (p.Result === GuildWarRequestResultRequestResultEnum.RequestSentToGuildMaster) {
      Social.systemMessage(text);
    } else {
      Social.errorMessage(text);
    }
  });

  /** `EnableGuildWar = true` plus `GuildWarName` / `GuildWarTeam`. */
  EventBus.on('GuildWarDeclared', packet => {
    const p = new GuildWarDeclaredPacket(packet);
    const enemy = cleanName(p.GuildName);
    runInAction(() => {
      Social.guildWar = {
        enemyGuild: enemy,
        soccer: p.Type === GuildWarTypeEnum.Soccer,
        team: p.TeamCode,
        ownScore: 0,
        enemyScore: 0,
      };
    });
    Social.systemMessage(
      t(p.Type === GuildWarTypeEnum.Soccer ? 'guild.soccerStarted' : 'guild.warStarted', {
        name: enemy,
      })
    );
  });

  EventBus.on('GuildWarScoreUpdate', packet => {
    const p = new GuildWarScoreUpdatePacket(packet);
    runInAction(() => {
      if (!Social.guildWar) return;
      Social.guildWar.ownScore = p.ScoreOfOwnGuild;
      Social.guildWar.enemyScore = p.ScoreOfEnemyGuild;
    });
  });

  /**
   * GuildSoccerScoreUpdate (F3 23): at the start of the match and on every
   * goal. Also reaches observers on the stadium, who have no `guildWar`.
   */
  EventBus.on('GuildSoccerScoreUpdate', packet => {
    const p = new GuildSoccerScoreUpdatePacket(packet);
    runInAction(() => {
      Social.battleSoccer = {
        redTeam: cleanName(p.RedTeamName),
        blueTeam: cleanName(p.BlueTeamName),
        redGoals: p.RedTeamGoals,
        blueGoals: p.BlueTeamGoals,
        seconds: Social.battleSoccer?.seconds ?? -1,
      };
    });
  });

  /** GuildSoccerTimeUpdate (F3 22): every second while the match runs. */
  EventBus.on('GuildSoccerTimeUpdate', packet => {
    const p = new GuildSoccerTimeUpdatePacket(packet);
    runInAction(() => {
      if (Social.battleSoccer) Social.battleSoccer.seconds = p.Seconds;
    });
  });

  /** `InitGuildWar`: the war state goes and every GuildTeam is recomputed. */
  EventBus.on('GuildWarEnded', packet => {
    const p = new GuildWarEndedPacket(packet);
    runInAction(() => {
      Social.guildWar = null;
      Social.battleSoccer = null;
      Social.guildWarRequest = null;
    });
    Social.systemMessage(t(GUILD_WAR_ENDINGS[p.Result] ?? 'guild.warEnded'));
  });

  /** GuildRelationshipRequest (0xE5): an alliance or hostility offer. */
  EventBus.on('GuildRelationshipRequest', packet => {
    const p = new GuildRelationshipRequestPacket(packet);
    const senderId = p.SenderId & 0x7fff;
    runInAction(() => {
      Social.guildRelationRequest = {
        senderId,
        senderName: playerNameById(senderId),
        relationship: p.RelationshipType,
        join: p.RequestType === GuildRelationshipRequestTypeEnum.Join,
      };
    });
  });

  EventBus.on('GuildRelationshipChangeResult', packet => {
    const p = new GuildRelationshipChangeResultPacket(packet);
    const alliance = p.RelationshipType === GuildRelationshipTypeEnum.Alliance;
    const joining = p.RequestType === GuildRelationshipRequestTypeEnum.Join;

    if (
      p.Result ===
      GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum.Success
    ) {
      Social.systemMessage(
        t(
          alliance
            ? joining
              ? 'guild.allianceFormed'
              : 'guild.allianceDissolved'
            : joining
              ? 'guild.nowHostile'
              : 'guild.hostilityEnded'
        )
      );
      // The `<Alliance>` line over every head comes out of GuildInformation,
      // and the alliance name in it has just changed for both guilds.
      GuildMarks.clear();
      Social.requestGuildList();
      if (Social.guildTab === 'alliance') Social.requestAllianceList();
      return;
    }

    Social.errorMessage(t(RELATIONSHIP_ERRORS[p.Result] ?? 'guild.requestFailed'));
  });

  /** `ReceiveUnionList` (WSclient.cpp:7502). */
  EventBus.on('AllianceList', packet => {
    const p = new AllianceListPacket(packet);
    runInAction(() => {
      Social.allianceGuilds = p.Success
        ? p.getGuilds().map(g => ({
            name: cleanName(g.GuildName),
            memberCount: g.MemberCount,
            logo: Array.from(new Uint8Array(g.Logo.buffer)),
          }))
        : [];
    });
  });

  EventBus.on('RemoveAllianceGuildResult', packet => {
    const p = new RemoveAllianceGuildResultPacket(packet);
    if (p.Result) {
      Social.systemMessage(t('guild.allianceRemoved'));
      GuildMarks.clear();
      Social.requestAllianceList();
    } else {
      Social.errorMessage(t('guild.allianceRemoveFailed'));
    }
  });
}
