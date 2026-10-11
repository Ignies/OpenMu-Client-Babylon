import { EventBus } from '@/core/eventBus';
import { PartyHealthUpdatePacket, PartyListPacket, PartyRequestPacket, RemovePartyMemberPacket } from '@versions/shared/packets/ServerToClientPackets';
import { Social } from '../social/social';
import { cleanName } from '../chat/chat';
import { playerNameById } from '../scope/objects';
import { runInAction } from 'mobx';
import { t } from '@/i18n';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // ---- party (`ReceiveParty*`, WSclient.cpp:6839) -----------------------------

  EventBus.on('PartyRequest', packet => {
    const p = new PartyRequestPacket(packet);
    const requesterId = p.RequesterId & 0x7fff;
    runInAction(() => {
      Social.partyRequest = {
        requesterId,
        requesterName: playerNameById(requesterId),
      };
    });
  });

  EventBus.on('PartyList', packet => {
    const p = new PartyListPacket(packet);
    const wasInParty = Social.inParty;
    Social.setPartyMembers(
      p.getMembers().map(m => ({
        name: cleanName(m.Name),
        index: m.Index,
        mapId: m.MapId,
        x: m.PositionX,
        y: m.PositionY,
        currentHealth: m.CurrentHealth,
        maximumHealth: m.MaximumHealth,
        healthStep: -1,
      }))
    );
    // ReceivePartyList (WSclient.cpp:7367) opens no window: the always-on list
    // (`versions/shared/ui/hud/party_list`) shows the members.
    if (!wasInParty && Social.inParty) Social.systemMessage(t('party.joined'));
  });

  EventBus.on('RemovePartyMember', packet => {
    const p = new RemovePartyMemberPacket(packet);
    Social.removePartyMember(p.Index);
  });

  EventBus.on('PartyHealthUpdate', packet => {
    const p = new PartyHealthUpdatePacket(packet);
    Social.setPartyHealth(
      p.getMembers().map(m => ({ index: m.Index, value: m.Value }))
    );
  });
}
