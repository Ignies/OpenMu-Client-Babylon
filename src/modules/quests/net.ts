import { EventBus } from '@/core/eventBus';
import { OpenNpcDialogPacket } from '@versions/shared/packets/ServerToClientPackets';
import { quests } from '.';
import { installKillCounters } from './killCounters';
import { installLegacyQuests } from './legacyQuests';
import { installNpcDialogue } from './npcDialogue';
import { installQuestLog } from './questLog';
import { installBalgassEntry } from './balgassEntry';

/**
 * Registers this module's packet listeners (see ../module.ts). Each entry registers its own; a packet
 * several entries handle runs them in this order (`AvailableQuests`: the dialogue, then the log).
 */
export function installNet(): void {
  installKillCounters();
  installLegacyQuests();
  installNpcDialogue();
  installQuestLog();
  installBalgassEntry();

  /**
   * F9 01 - `ReceiveNPCDlgUIStart`: the server opened the Season 6 NPC
   * dialogue (`g_QuestMng.SetNPC`, `INTERFACE_NPC_DIALOGUE`). Routed to the
   * quests facade, which opens what it can for that NPC number.
   */
  EventBus.on('OpenNpcDialog', packet => {
    if (packet.byteLength < OpenNpcDialogPacket.Length!) return;
    const p = new OpenNpcDialogPacket(packet);
    quests.openNpcDialog(p.NpcNumber, p.GensContributionPoints);
  });
}
