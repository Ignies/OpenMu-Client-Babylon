import { ApplyKeyConfigurationPacket } from '@versions/shared/packets/ServerToClientPackets';
import { EventBus } from '@/core/eventBus';
import { Store } from '@/app/store';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  // ---------------------------------------------------------------------------
  // Packets OpenMU S6 sends that had no handler.
  // ---------------------------------------------------------------------------

  /**
   * F3 30 - `ReceiveOption` (`LPPRECEIVE_OPTION`): the key configuration the
   * server saved for this character. Layout after the sub-code: `HotKey[20]`
   * (ten big-endian words, skill *numbers*, 0xFFFF = empty), `GameOption`
   * (auto-attack / whisper sound / slide help bits), `KeyQWE[3]`, `ChatLogBox`,
   * `KeyR`, `QWERLevel`. Only the hot keys are restored; the rest has no
   * consumer here yet (the Q/W/E/R potion slots are inventory-driven).
   */
  EventBus.on('ApplyKeyConfiguration', packet => {
    const p = new ApplyKeyConfigurationPacket(packet);
    const data = p.Configuration;
    if (data.byteLength < 20) return;

    const hotkeys: number[] = [];
    for (let i = 0; i < 10; i++) {
      const word = (data.getUint8(i * 2) << 8) | data.getUint8(i * 2 + 1);
      hotkeys.push(word === 0xffff ? -1 : word);
    }
    Store.applyKeyConfiguration(hotkeys);
  });
}
