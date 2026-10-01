import { AssignCharacterToGuildPacket, GuildCreationResultGuildCreationErrorTypeEnum, GuildCreationResultPacket, GuildInformationPacket, GuildJoinRequestPacket as GuildJoinRequestS2CPacket, GuildJoinResponseGuildJoinRequestResultEnum, GuildJoinResponsePacket as GuildJoinResponseS2CPacket, GuildKickResponseGuildKickSuccessEnum, GuildKickResponsePacket, GuildListPacket, GuildMemberLeftGuildPacket } from '@versions/shared/packets/ServerToClientPackets';
import { EventBus } from '@/core/eventBus';
import { GuildInfoRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { Social } from '../social/social';
import { Store } from '@/app/store';
import { t, type TextKey } from '@/i18n';
import { cleanName } from '../chat/chat';
import { playerNameById } from '../_shared/net_helpers';
import { runInAction } from 'mobx';

/**
 * GuildInformation: the original's `GuildMark[]` table (`ReceiveGuildViewport`),
 * keyed by guild id so AssignCharacterToGuild members can print `[Guild]`
 * and draw the mark.
 */
EventBus.on('GuildInformation', packet => {
  const p = new GuildInformationPacket(packet);
  Store.guilds.set(p.GuildId, {
    name: cleanName(p.GuildName),
    alliance: cleanName(p.AllianceGuildName),
    logo: Array.from(new Uint8Array(p.Logo.buffer)),
  });
});

EventBus.on('AssignCharacterToGuild', packet => {
  const p = new AssignCharacterToGuildPacket(packet);
  const world = Store.world;
  if (!world) return;
  const requested = new Set<number>();
  p.getMembers().forEach(member => {
    const maskedId = member.PlayerId & 0x7fff;
    const obj = world.getByNetId(maskedId);
    if (obj) {
      world.addComponent(obj, 'guild', { id: member.GuildId, role: member.Role });
      obj.guild = { id: member.GuildId, role: member.Role };
    }
    if (maskedId === Store.playerId) {
      runInAction(() => {
        Social.myGuild = { id: member.GuildId, role: member.Role };
      });
    }
    // Unknown guild: ask for its name/mark, as the original does for a new GuildMarkIndex.
    if (!Store.guilds.has(member.GuildId) && !requested.has(member.GuildId)) {
      requested.add(member.GuildId);
      const req = GuildInfoRequestPacket.createPacket();
      req.GuildId = member.GuildId;
      Store.sendToGS(req.buffer);
    }
  });
});

/**
 * The hero is out of a guild: `ReceiveGuildLeave` clears the window, the
 * member list and the mark. When the guild itself is gone (disband) every
 * member in scope loses its mark too, not just the hero.
 */
function leaveGuild(guildId: number, disbanded: boolean): void {
  const world = Store.world;
  if (world) {
    const gone = world.netObjsQuery.entities.filter(
      e => e.guild && (disbanded ? e.guild.id === guildId : e.netId === Store.playerId)
    );
    for (const obj of gone) world.removeComponent(obj, 'guild');
  }
  if (disbanded) Store.guilds.delete(guildId);
  runInAction(() => {
    Social.myGuild = null;
    Social.guildMembers = [];
    Social.allianceGuilds = [];
    Social.guildWar = null;
    Social.battleSoccer = null;
    Social.guildRivalName = '';
    Social.guildTotalScore = 0;
    Social.guildCurrentScore = 0;
    Social.guildWindowEnabled = false;
  });
}

EventBus.on('GuildMemberLeftGuild', packet => {
  const p = new GuildMemberLeftGuildPacket(packet);
  const world = Store.world;
  if (!world) return;
  const maskedId = p.PlayerId & 0x7fff;
  const obj = world.getByNetId(maskedId);
  if (obj?.guild) world.removeComponent(obj, 'guild');
  if (maskedId === Store.playerId) {
    // `ReceiveGuildLeave` 1 / 4: no guild, window closed. The disband
    // response may have cleared it already - then there is nothing to say.
    const mine = Social.myGuild;
    if (!mine) return;
    leaveGuild(mine.id, p.IsGuildMaster);
    Social.errorMessage(t(p.IsGuildMaster ? 'guild.disbanded' : 'guild.youLeft'));
  } else if (obj?.objectNameInWorld && Social.myGuild) {
    Social.systemMessage(
      t('guild.memberLeft', { name: obj.objectNameInWorld })
    );
    if (Social.guildWindowEnabled) Social.requestGuildList();
  }
});

// ---- guild (`ReceiveGuild*`, WSclient.cpp:6987) -----------------------------

EventBus.on('GuildJoinRequest', packet => {
  const p = new GuildJoinRequestS2CPacket(packet);
  const requesterId = p.RequesterId & 0x7fff;
  runInAction(() => {
    Social.guildJoinRequest = {
      requesterId,
      requesterName: playerNameById(requesterId),
    };
  });
});

const GUILD_JOIN_RESULTS: Record<GuildJoinResponseGuildJoinRequestResultEnum, TextKey> = {
  [GuildJoinResponseGuildJoinRequestResultEnum.Refused]: 'guild.joinRefused',
  [GuildJoinResponseGuildJoinRequestResultEnum.Accepted]: 'guild.joined',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildFull]: 'guild.isFull',
  [GuildJoinResponseGuildJoinRequestResultEnum.Disconnected]: 'guild.masterUnavailable',
  [GuildJoinResponseGuildJoinRequestResultEnum.NotTheGuildMaster]: 'guild.notGuildMaster',
  [GuildJoinResponseGuildJoinRequestResultEnum.AlreadyHaveGuild]: 'guild.alreadyInGuild',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildMasterOrRequesterIsBusy]:
    'guild.masterBusy',
  [GuildJoinResponseGuildJoinRequestResultEnum.MinimumLevel6]: 'guild.needLevel6',
};

EventBus.on('GuildJoinResponse', packet => {
  const p = new GuildJoinResponseS2CPacket(packet);
  const text = t(GUILD_JOIN_RESULTS[p.Result] ?? 'guild.requestFailed');
  if (p.Result === GuildJoinResponseGuildJoinRequestResultEnum.Accepted) {
    Social.systemMessage(text);
  } else {
    Social.errorMessage(text);
  }
});

EventBus.on('GuildList', packet => {
  const p = new GuildListPacket(packet);
  runInAction(() => {
    Social.guildMembers = p.IsInGuild
      ? p.getMembers().map(m => ({
          name: cleanName(m.Name),
          // `(0x80 & CurrentServer) ? (0x7F & CurrentServer) : -1`: the
          // flagged byte is the *second* server field - OpenMU writes the raw
          // id into ServerId and `0x80 + id` (0x7F offline) into ServerId2
          // (ShowGuildListPlugIn.cs:60), and server 0 has no bit at all in
          // the first one, so every member read as offline before.
          server: m.ServerId2 & 0x80 ? m.ServerId2 & 0x7f : -1,
          role: m.Role,
        }))
      : [];
    Social.guildTotalScore = Math.max(0, p.TotalScore);
    Social.guildCurrentScore = p.CurrentScore;
    Social.guildRivalName = cleanName(p.RivalGuildName);
  });
});

EventBus.on('GuildKickResponse', packet => {
  const p = new GuildKickResponsePacket(packet);
  switch (p.Result) {
    case GuildKickResponseGuildKickSuccessEnum.KickSucceeded:
      // OpenMU answers the *kicked* player and a member who left with the
      // same code, right after GuildMemberLeftGuild has already cleared
      // `myGuild` and printed "You have left the guild" (verified live) -
      // only the master, still in the guild, gets the removal line.
      if (Social.myGuild) {
        Social.systemMessage(t('guild.memberRemoved'));
        if (Social.guildWindowEnabled) Social.requestGuildList();
      }
      break;
    case GuildKickResponseGuildKickSuccessEnum.GuildDisband: {
      // `GameServer.GuildDeletedAsync` drops the guild from `_playersByGuild`
      // *before* it walks the members, so `ForEachGuildPlayerAsync` finds
      // nobody and the GuildMemberLeftGuild / KickSucceeded that should
      // follow are never sent (OpenMU, verified 2026-08-31). This response is
      // the whole story: clear the guild here.
      const mine = Social.myGuild;
      if (!mine) break;
      leaveGuild(mine.id, true);
      Social.errorMessage(t('guild.disbanded'));
      break;
    }
    case GuildKickResponseGuildKickSuccessEnum.GuildMemberWithdrawn:
      // `ReceiveGuildLeave` 5: re-read the list.
      Social.requestGuildList();
      break;
    case GuildKickResponseGuildKickSuccessEnum.KickFailedBecausePlayerIsNotGuildMaster:
      Social.errorMessage(t('guild.onlyMasterRemoves'));
      break;
    case GuildKickResponseGuildKickSuccessEnum.FailedPasswordIncorrect:
      Social.errorMessage(t('guild.wrongPassword'));
      break;
    default:
      Social.errorMessage(t('guild.requestFailed'));
      break;
  }
});

EventBus.on('ShowGuildMasterDialog', () => {
  runInAction(() => {
    Social.guildMasterDialog = true;
  });
});

EventBus.on('ShowGuildCreationDialog', () => {
  runInAction(() => {
    Social.guildMasterDialog = false;
    Social.guildCreationDialog = true;
    Social.guildCreationPending = false;
  });
});

EventBus.on('GuildCreationResult', packet => {
  const p = new GuildCreationResultPacket(packet);
  runInAction(() => {
    Social.guildCreationPending = false;
  });
  if (p.Success) {
    // `ReceiveCreateGuildResult` 1: the dialog goes; AssignCharacterToGuild
    // brings the new guild in.
    runInAction(() => {
      Social.guildCreationDialog = false;
    });
    Social.systemMessage(t('guild.created'));
    return;
  }
  Social.errorMessage(
    t(
      p.Error === GuildCreationResultGuildCreationErrorTypeEnum.GuildNameAlreadyTaken
        ? 'guild.nameTaken'
        : 'guild.createFailed'
    )
  );
});
