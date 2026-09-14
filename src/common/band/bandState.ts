import { instrumentById, type InstrumentId } from '../instruments';

/**
 * Who voices which channel of a performance. The master voices every
 * channel nobody has taken; a member's mask is the channels they took on
 * their own instrument. Channel 9 (MIDI 10, percussion) is only ever voiced
 * by an instrument whose row says so - none does yet, so it is silent.
 *
 * Pure data; the same shape travels in the `bandState` frame.
 */

export const PERCUSSION_CHANNEL = 9;

export type BandMember = {
  netId: number;
  instrument: InstrumentId;
  /** Bit `c` set: this member voices channel `c`. */
  channelMask: number;
};

export type BandState = {
  masterId: number;
  members: BandMember[];
};

/** A mask over all sixteen channels. */
export const ALL_CHANNELS = 0xffff;

export function hasChannel(mask: number, channel: number): boolean {
  return (mask & (1 << channel)) !== 0;
}

/** Bits of every channel some member has taken. */
export function takenChannels(state: BandState): number {
  let mask = 0;
  for (const m of state.members) mask |= m.channelMask;
  return mask & ALL_CHANNELS;
}

/** The net id that voices `channel`: the member holding it, else the master. */
export function ownerOf(state: BandState, channel: number): number {
  for (const m of state.members) if (hasChannel(m.channelMask, channel)) return m.netId;
  return state.masterId;
}

/** The mask the master voices itself: everything not taken. */
export function masterMask(state: BandState): number {
  return ALL_CHANNELS & ~takenChannels(state);
}

/** Whether an instrument may voice a channel at all. */
export function canRender(instrument: InstrumentId, channel: number): boolean {
  if (channel !== PERCUSSION_CHANNEL) return true;
  return instrumentById(instrument).percussion === true;
}

export function memberOf(state: BandState, netId: number): BandMember | null {
  return state.members.find(m => m.netId === netId) ?? null;
}

/** A copy with `member` added or replaced. */
export function withMember(state: BandState, member: BandMember): BandState {
  return {
    masterId: state.masterId,
    members: [...state.members.filter(m => m.netId !== member.netId), member],
  };
}

export function withoutMember(state: BandState, netId: number): BandState {
  return { masterId: state.masterId, members: state.members.filter(m => m.netId !== netId) };
}
