import { instrumentById, type InstrumentId } from '../instruments';

/**
 * Who voices which channel of a performance. The master voices every
 * channel of their song; a member doubles it on their own instrument, from
 * where they stand, on the channels in their mask (Space Station 14's
 * band: one file, every instrument in the band plays it). Channel 9 (MIDI
 * 10, percussion) is only ever voiced by a drum kit, and a kit voices
 * nothing else: its notes are drums, not pitches.
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

/** Everyone who voices `channel`: the master first, then each member whose mask has it. */
export function ownersOf(state: BandState, channel: number): number[] {
  const owners = [state.masterId];
  for (const m of state.members) if (hasChannel(m.channelMask, channel)) owners.push(m.netId);
  return owners;
}

/** The mask the master voices: all of it, a band takes nothing away from them. */
export function masterMask(_state: BandState): number {
  return ALL_CHANNELS;
}

/** Whether an instrument may voice a channel at all: a kit takes the percussion channel, the rest take the others. */
export function canRender(instrument: InstrumentId, channel: number): boolean {
  const kit = instrumentById(instrument).percussion === true;
  return (channel === PERCUSSION_CHANNEL) === kit;
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
