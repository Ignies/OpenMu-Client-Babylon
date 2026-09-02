import { describe, expect, it } from 'vitest';
import { ChangeMapServerInfoPacket } from './mapServerMove';

function buildPacket(): DataView {
  const bytes = new Uint8Array(40);
  bytes[0] = 0xc1;
  bytes[1] = 40;
  bytes[2] = 0xb1;
  bytes[3] = 0x00;
  const ip = '192.168.0.7';
  for (let i = 0; i < ip.length; i++) bytes[4 + i] = ip.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  view.setUint16(20, 55902, true);
  view.setUint16(22, 3, true);
  view.setUint32(24, 0x11223344, true);
  view.setUint32(28, 0x55667788, true);
  view.setUint32(32, 0x99aabbcc, true);
  view.setUint32(36, 0xddeeff00, true);
  return view;
}

describe('ChangeMapServerInfoPacket', () => {
  it('parses the original C1 B1 00 layout', () => {
    const p = new ChangeMapServerInfoPacket(buildPacket());
    expect(p.IpAddress).toBe('192.168.0.7');
    expect(p.Port).toBe(55902);
    expect(p.ServerCode).toBe(3);
    expect(p.AuthCode1).toBe(0x11223344);
    expect(p.AuthCode2).toBe(0x55667788);
    expect(p.AuthCode3).toBe(0x99aabbcc);
    expect(p.AuthCode4).toBe(0xddeeff00);
  });

  it('stops the ip at the terminator and survives a full field', () => {
    const view = buildPacket();
    for (let i = 4; i < 20; i++) view.setUint8(i, 0x31);
    const p = new ChangeMapServerInfoPacket(view);
    expect(p.IpAddress).toBe('1111111111111111');
  });
});
