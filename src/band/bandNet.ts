import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import { Social } from '../social';
import { t, type TextKey } from '../i18n';
import {
  BAND_VERSION,
  BandSub,
  RefuseCause,
  StopReason,
  decodeRelayFrame,
  encodeBandState,
  encodeJoin,
  encodeLeave,
  encodeStart,
  encodeStop,
} from '../common/bandProtocol';
import { instrumentById, instrumentByIndex, instrumentIndex } from '../common/instruments';
import {
  Band,
  masterStateChanged,
  memberChanged,
  refused,
  remoteBandState,
  remoteBatch,
  remoteStart,
  remoteStop,
  setBandAvailable,
  setBandTransport,
  stoppedByProxy,
  type BandTransport,
} from '../common/band';
import { BandSender } from './bandSender';

/**
 * The band system's one wire listener, and the transport it hands the
 * facade. Inbound: the proxy's `BandRelay` frames (C1 FA) - a performer in
 * scope starting, stopping, sending notes, a band changing, or a notice
 * meant for this client. Outbound: the facade's start / stop / batch / join
 * / leave / state, as frames through `Store.sendBandFrame`, only once the
 * proxy has said hello - a proxy without the relay would forward the code
 * to the game server, which is nobody's business.
 *
 * Installed once from `logic.ts`. Everything it knows about instruments it
 * reads off the registry; everything it does with them goes through the
 * facade.
 */

const STOP_TEXT: Partial<Record<number, TextKey>> = {
  [StopReason.Flood]: 'instrument.stopped.flood',
  [StopReason.Order]: 'instrument.stopped.order',
  [StopReason.Gone]: 'instrument.stopped.gone',
};

const REFUSE_TEXT: Partial<Record<number, TextKey>> = {
  [RefuseCause.Cooldown]: 'instrument.refused.cooldown',
  [RefuseCause.Busy]: 'instrument.refused.busy',
  [RefuseCause.Full]: 'instrument.refused.full',
  [RefuseCause.Range]: 'instrument.refused.range',
  [RefuseCause.Map]: 'instrument.refused.map',
  [RefuseCause.NotPerforming]: 'instrument.refused.notPerforming',
  [RefuseCause.Rate]: 'instrument.refused.rate',
};

let installed = false;

function nameOf(netId: number): string {
  return Store.world?.getByNetId(netId)?.objectNameInWorld ?? `#${netId}`;
}

export function installBandNet(): void {
  if (installed) return;
  installed = true;

  const sender = new BandSender(frame => Store.sendBandFrame(frame));
  const online = () => Band.available && !Store.isOffline;

  const transport: BandTransport = {
    start(instrument) {
      if (!online()) return;
      sender.reset();
      Store.sendBandFrame(encodeStart(instrument));
    },
    stop() {
      if (!online()) return;
      Store.sendBandFrame(encodeStop());
    },
    batch(baseMs, events) {
      if (!online()) return;
      sender.push(baseMs, events);
    },
    join(masterId, instrument, channelMask) {
      if (!online()) return;
      Store.sendBandFrame(encodeJoin(masterId, instrument, channelMask));
    },
    leave() {
      if (!online()) return;
      Store.sendBandFrame(encodeLeave());
    },
    state(masterMask, members) {
      if (!online()) return;
      Store.sendBandFrame(
        encodeBandState(
          masterMask,
          members.map(m => ({ id: m.netId, instrument: instrumentIndex(m.instrument), mask: m.channelMask }))
        )
      );
    },
  };
  setBandTransport(transport);

  EventBus.on('wsClosed', () => setBandAvailable(false));

  EventBus.on('BandRelay', view => {
    const msg = decodeRelayFrame(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    if (!msg) return;

    if (msg.sub === BandSub.Hello) {
      setBandAvailable(msg.version === BAND_VERSION);
      return;
    }

    const self = Store.playerId ?? -1;

    if (msg.performerId === self) {
      // A notice about this client's own performance.
      if (msg.sub === BandSub.Stop) {
        const key = STOP_TEXT[msg.reason];
        if (key) Social.systemMessage(t(key));
        stoppedByProxy();
      } else if (msg.sub === BandSub.Refused) {
        const key = REFUSE_TEXT[msg.cause] ?? 'instrument.refused.busy';
        const text = t(key, { seconds: msg.arg });
        Social.systemMessage(text);
        refused(key);
      } else if (msg.sub === BandSub.Join) {
        // Someone joined the hero's band: the stamped id is the joiner's.
      }
      return;
    }

    const world = Store.world;
    if (!world) return;

    switch (msg.sub) {
      case BandSub.Start: {
        const def = instrumentByIndex(msg.instrument);
        const entity = world.getByNetId(msg.performerId);
        if (!def || !entity || entity.objOutOfScope) return;
        remoteStart(entity, def.id);
        Social.systemMessage(t('instrument.startsPlaying', { name: nameOf(msg.performerId), instrument: t(def.labelKey) }));
        return;
      }
      case BandSub.Stop: {
        const known = world.getByNetId(msg.performerId)?.performing;
        remoteStop(msg.performerId);
        if (known && msg.reason === StopReason.Ended) {
          Social.systemMessage(t('instrument.stopsPlaying', { name: nameOf(msg.performerId) }));
        }
        return;
      }
      case BandSub.Batch:
        remoteBatch(msg.performerId, msg.seq, msg.baseMs, msg.events);
        return;
      case BandSub.Join: {
        // The hero is the master named in the body; the joiner is the stamped id.
        if (msg.masterId !== self) return;
        const def = instrumentByIndex(msg.instrument);
        if (!def) return;
        memberChanged({ netId: msg.performerId, instrument: def.id, channelMask: msg.mask }, msg.performerId);
        Social.systemMessage(t('instrument.joinsBand', { name: nameOf(msg.performerId), master: t('instrument.you') }));
        return;
      }
      case BandSub.Leave:
        if (Band.role === 'master') {
          memberChanged(null, msg.performerId);
          Social.systemMessage(t('instrument.leavesBand', { name: nameOf(msg.performerId) }));
        }
        return;
      case BandSub.BandState: {
        const members = msg.members
          .map(m => {
            const def = instrumentByIndex(m.instrument);
            return def ? { netId: m.id, instrument: def.id, channelMask: m.mask } : null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);
        if (Band.role === 'member' && Band.band?.masterId === msg.performerId) {
          masterStateChanged(msg.performerId, members);
        }
        remoteBandState(msg.performerId, members);
        return;
      }
      case BandSub.ChannelNames:
        return;
    }
  });
}

export { instrumentById };
