import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet: installChat } = await import('../chat/net');
const { installBloodCastle } = await import('./bloodCastle');
const { installChaosCastle } = await import('./chaosCastle');
const { setNotificationSink } = await import('../chat/notify');
const { EventBus } = await import('@/core/eventBus');
const { t } = await import('@/i18n');
const {
  BloodCastleEnterResultPacket,
  BloodCastleEnterResultEnterResultEnum,
  ChaosCastleEnterResultPacket,
  ChaosCastleEnterResultEnterResultEnum,
  ServerMessagePacket,
} = await import('@versions/shared/packets/ServerToClientPackets');

installChat();
installBloodCastle();
installChaosCastle();

const errors: string[] = [];
setNotificationSink((text, type) => {
  if (type === 'error') errors.push(text);
});

/** The server's blue system line (`ServerMessage` type 1). */
function systemLine(text: string): void {
  const p = ServerMessagePacket.createPacket(4 + text.length + 1);
  p.Type = 1;
  p.setMessage(text);
  EventBus.emit('ServerMessage', p.buffer);
}

function bloodCastleFailed(): void {
  const p = BloodCastleEnterResultPacket.createPacket();
  p.Result = BloodCastleEnterResultEnterResultEnum.Failed;
  EventBus.emit('BloodCastleEnterResult', p.buffer);
}

const FENRIR = "Can't enter event with equipped item 'Horn of Fenrir'.";

// OpenMU answers a refused entry with a bare `Failed`, after a line saying why.
describe('a refused event entry', () => {
  it('says what the server said just before, not the cloak', () => {
    errors.length = 0;
    systemLine(FENRIR);
    bloodCastleFailed();
    expect(errors).toEqual([FENRIR]);

    systemLine(FENRIR);
    const p = ChaosCastleEnterResultPacket.createPacket();
    p.Result = ChaosCastleEnterResultEnterResultEnum.Failed;
    EventBus.emit('ChaosCastleEnterResult', p.buffer);
    expect(errors).toEqual([FENRIR, FENRIR]);
  });

  it('keeps the original cloak text when the server gave no reason', () => {
    errors.length = 0;
    systemLine('You received 10 Zen.');
    bloodCastleFailed();
    expect(errors).toEqual([t('event.cloakLevelWrong')]);
  });
});
