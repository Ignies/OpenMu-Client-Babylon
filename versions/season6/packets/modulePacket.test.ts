import { describe, expect, it } from 'vitest';
import { MODULE_PACKET_CODE } from '@/modules/_api/packetWire';
import { ServerToClientPackets as season6 } from './index';
import { ServerToClientPackets as v097d } from '../../v097d/packets';
import { ModulePacket } from './modulePacket';

describe('ModulePacket', () => {
  it('keeps the shape the dispatcher resolves by: any frame of the code, at any length', () => {
    expect(ModulePacket.Code).toBe(MODULE_PACKET_CODE);
    expect((ModulePacket as { SubCode?: number }).SubCode).toBeUndefined();
    expect(ModulePacket.Length).toBeUndefined();
    expect(ModulePacket.Name).toBe('ModulePacket');
  });

  it('is the only packet of its code in every version\'s set', () => {
    for (const set of [season6, v097d]) expect(set.filter(p => p.Code === MODULE_PACKET_CODE)).toEqual([ModulePacket]);
  });
});
