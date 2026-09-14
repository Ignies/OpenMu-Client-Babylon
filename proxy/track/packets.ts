import {
  CharacterInformationPacket,
  CharacterLevelUpdatePacket,
  ExperienceGainedPacket,
  GameServerEnteredPacket,
  InventoryMoneyUpdatePacket,
  ItemAddedToInventoryPacket,
  MapChangedPacket,
  ObjectGotKilledPacket,
  RespawnAfterDeathPacket,
  ServerMessagePacket,
} from '../../src/common/packets/ServerToClientPackets';
import {
  HitRequestPacket,
  PickupItemRequestPacket,
  PublicChatMessagePacket,
  SelectCharacterPacket,
  WalkRequestPacket,
  WhisperMessagePacket,
} from '../../src/common/packets/ClientToServerPackets';
import { nameBytes, packetBytes, rawFrame } from './wire';

/**
 * Plain (unencrypted) packets the way the two ends build them, for the demo
 * and the tests. Anything the generated classes can write goes through
 * their setters; the list-shaped ones they can only read are laid out by
 * hand from the same offsets their readers use.
 */

/* ----------------------------------------------------------------- server */

export function gameServerEntered(playerId: number): Uint8Array {
  const p = GameServerEnteredPacket.createPacket();
  p.Success = true;
  p.PlayerId = playerId;
  return packetBytes(p);
}

export type ListedCharacter = { name: string; cls: number; level: number; status?: number };

/** `CharacterList` (F3 00): 34 bytes per character from byte 8. */
export function characterList(characters: ListedCharacter[]): Uint8Array {
  const body: number[] = [0xf3, 0x00, 0, 0, characters.length, 0];
  characters.forEach((c, slot) => {
    const entry = new Array<number>(34).fill(0);
    entry[0] = slot;
    entry.splice(1, 10, ...nameBytes(c.name, 10));
    entry[12] = c.level & 0xff;
    entry[13] = c.level >> 8;
    entry[14] = (c.status ?? 0) & 0x0f;
    // Appearance byte 0: the class number in the high five bits.
    entry[15] = c.cls << 3;
    body.push(...entry);
  });
  return rawFrame(0xc1, body);
}

export type CharacterInfo = {
  x: number;
  y: number;
  map: number;
  money?: number;
  heroState?: number;
  status?: number;
  hp?: number;
  maxHp?: number;
};

export function characterInformation(info: CharacterInfo): Uint8Array {
  const p = CharacterInformationPacket.createPacket();
  p.X = info.x;
  p.Y = info.y;
  p.MapId = info.map;
  p.Money = info.money ?? 0;
  p.HeroState = info.heroState ?? 3;
  p.Status = info.status ?? 0;
  p.CurrentHealth = info.hp ?? 100;
  p.MaximumHealth = info.maxHp ?? 100;
  return packetBytes(p);
}

export type ScopedNpc = { id: number; type: number; x: number; y: number };

/** `AddNpcsToScope` (C2 13): 10 bytes per NPC from byte 5. */
export function npcsInScope(npcs: ScopedNpc[]): Uint8Array {
  const body: number[] = [0x13, npcs.length];
  for (const npc of npcs) {
    body.push(npc.id >> 8, npc.id & 0xff, npc.type >> 8, npc.type & 0xff, npc.x, npc.y, npc.x, npc.y, 0, 0);
  }
  return rawFrame(0xc2, body);
}

export type ScopedPlayer = { id: number; name: string; x: number; y: number };

/** `AddCharactersToScope` (C2 12): 36 bytes per character from byte 5, no effects. */
export function playersInScope(players: ScopedPlayer[]): Uint8Array {
  const body: number[] = [0x12, players.length];
  for (const player of players) {
    const entry = new Array<number>(36).fill(0);
    entry[0] = player.id >> 8;
    entry[1] = player.id & 0xff;
    entry[2] = player.x;
    entry[3] = player.y;
    entry.splice(22, 10, ...nameBytes(player.name, 10));
    entry[32] = player.x;
    entry[33] = player.y;
    entry[34] = 3;
    body.push(...entry);
  }
  return rawFrame(0xc2, body);
}

export function mapChanged(map: number, x: number, y: number, isMapChange = true): Uint8Array {
  const p = MapChangedPacket.createPacket();
  p.IsMapChange = isMapChange;
  p.MapNumber = map;
  p.PositionX = x;
  p.PositionY = y;
  return packetBytes(p);
}

export function respawn(map: number, x: number, y: number, money = 0): Uint8Array {
  const p = RespawnAfterDeathPacket.createPacket();
  p.MapNumber = map;
  p.PositionX = x;
  p.PositionY = y;
  p.Money = money;
  return packetBytes(p);
}

export function objectKilled(killedId: number, killerId: number, skillId = 0): Uint8Array {
  const p = ObjectGotKilledPacket.createPacket();
  p.KilledId = killedId;
  p.KillerId = killerId;
  p.SkillId = skillId;
  return packetBytes(p);
}

export function experience(fromId: number, amount: number): Uint8Array {
  const p = ExperienceGainedPacket.createPacket();
  p.KilledObjectId = fromId;
  p.AddedExperience = amount;
  p.DamageOfLastHit = 0;
  return packetBytes(p);
}

export function levelUpdate(level: number): Uint8Array {
  const p = CharacterLevelUpdatePacket.createPacket();
  p.Level = level;
  return packetBytes(p);
}

export function moneyUpdate(money: number): Uint8Array {
  const p = InventoryMoneyUpdatePacket.createPacket();
  p.Money = money;
  return packetBytes(p);
}

/** 12 wire bytes of a plain item: group, number, level. */
export function itemBytes(group: number, number: number, level = 0): number[] {
  return [number & 0xff, (level & 0x0f) << 3, 255, number > 255 ? 0x80 : 0, 0, group << 4, 0, 0xff, 0xff, 0xff, 0xff, 0xff];
}

/** `ItemsDropped` (C2 20): 16 bytes per drop from byte 5, fresh flag in the id's high bit. */
export function itemsDropped(drops: { id: number; x: number; y: number; item: number[]; fresh?: boolean }[]): Uint8Array {
  const body: number[] = [0x20, drops.length];
  for (const drop of drops) {
    body.push(((drop.id >> 8) & 0x7f) | (drop.fresh === false ? 0 : 0x80), drop.id & 0xff, drop.x, drop.y, ...drop.item);
  }
  return rawFrame(0xc2, body);
}

export function itemAdded(slot: number, item: number[]): Uint8Array {
  const p = ItemAddedToInventoryPacket.createPacket(16);
  p.InventorySlot = slot;
  p.setItemData(item, 12);
  return packetBytes(p);
}

export function serverMessage(text: string, type = 1): Uint8Array {
  const p = ServerMessagePacket.createPacket(4 + text.length + 1);
  p.Type = type;
  p.setMessage(text, text.length);
  return packetBytes(p);
}

/* ----------------------------------------------------------------- client */

export function selectCharacter(name: string): Uint8Array {
  const p = SelectCharacterPacket.createPacket();
  p.setName(name, 10);
  return packetBytes(p);
}

/** `WalkRequest` (D4): directions two per byte, the first in the high nibble. */
export function walk(x: number, y: number, dirs: number[]): Uint8Array {
  const packed = new Array<number>(Math.ceil(dirs.length / 2)).fill(0);
  dirs.forEach((dir, i) => {
    packed[i >> 1] |= (dir & 0x0f) << (i % 2 === 0 ? 4 : 0);
  });
  const p = WalkRequestPacket.createPacket(6 + packed.length);
  p.SourceX = x;
  p.SourceY = y;
  p.StepCount = dirs.length;
  p.TargetRotation = dirs[dirs.length - 1] ?? 0;
  p.setDirections(packed, packed.length);
  return packetBytes(p);
}

export function chat(sender: string, text: string): Uint8Array {
  const p = PublicChatMessagePacket.createPacket(13 + text.length + 1);
  p.setCharacter(sender, 10);
  p.setMessage(text, text.length);
  return packetBytes(p);
}

export function whisper(to: string, text: string): Uint8Array {
  const p = WhisperMessagePacket.createPacket(13 + text.length + 1);
  p.setReceiverName(to, 10);
  p.setMessage(text, text.length);
  return packetBytes(p);
}

export function hit(targetId: number): Uint8Array {
  const p = HitRequestPacket.createPacket();
  p.TargetId = targetId;
  p.AttackAnimation = 120;
  p.LookingDirection = 0;
  return packetBytes(p);
}

export function pickup(itemId: number): Uint8Array {
  const p = PickupItemRequestPacket.createPacket();
  p.ItemId = itemId;
  return packetBytes(p);
}
