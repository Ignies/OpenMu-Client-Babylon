/**
 * Which of a prop batch chunk's placements a frame re-packs. Whether a chunk
 * is re-packed at all stays the whole-chunk rule of `?repackAll=1`; inside it
 * only placements whose light can have moved are packed and compared.
 */

/** What the batches read off a placement's `LightCarrier`. */
export type LightHost = {
  readonly Ready: boolean;
  readonly Light: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
};

export type LightPlacement = {
  readonly pos: { readonly x: number; readonly z: number };
  readonly entity: { readonly modelObject?: LightHost };
};

/** A chunk's tile box of placements, for the emitter reach test. */
export type LightBox = {
  readonly minX: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxZ: number;
};

/** The frame's inputs, shared by every chunk. */
export type LightFrame<P extends LightPlacement> = {
  /** Classic: the torch delta is in the body light, and a chunk it reaches re-packs. */
  classic: boolean;
  snow: boolean;
  /** `terrainMaskVersion()`, read on a snow map. */
  maskVersion: number;
  /** `terrainLightTouchedVersion()`. */
  touchedVersion: number;
  /** Counts the batches' updates; `RenderSystem` runs between two of them. */
  serial: number;
  /** `terrainLightTouchesSample`. */
  touches(x: number, z: number): boolean;
  /** `terrainLightReaches` over the box. */
  reaches(box: LightBox): boolean;
  /** The placement's four instance floats, exactly as a whole-chunk pack writes them. */
  pack(p: P, host: LightHost | null, out: Float32Array): void;
};

const packed = new Float32Array(4);
const packedBits = new Uint32Array(packed.buffer);
const candidates: number[] = [];

function readyHost(p: LightPlacement): LightHost | null {
  const host = p.entity.modelObject;
  return host?.Ready === true ? host : null;
}

export class ChunkLight<P extends LightPlacement> {
  /** A carrier stood in the chunk last frame: one more pass after it goes. */
  litLastFrame = false;
  /** Passed over while its cell was off: the next visit packs whatever may have moved. */
  skipped = false;

  private readonly bits: Uint32Array;
  /** The ready carrier each placement was last packed from, or null. */
  private readonly hosts: (LightHost | null)[];
  /** The update each of those carriers was first packed in. */
  private readonly hostSince: Float64Array;
  /** 1 while a placement may differ from its idle pack: the dirty-last-frame set. */
  private readonly dirty: Uint8Array;
  private readonly touched: Uint8Array;
  private touchedList: number[] = [];
  private touchedVersion = -1;
  /** The dirty placements, for a type with no carriers (a lit type scans them all). */
  private dirtyList: number[] = [];
  private spareList: number[] = [];
  /** Mask version of the last full pack; a snow map's alpha is current from there. */
  private maskVersion = -1;

  constructor(
    readonly placements: readonly P[],
    readonly inst: Float32Array,
    /** The type has carriers (`PropType.lit`). */
    readonly lit: boolean,
    /** ...and they own a light source, whose colour moves every frame. */
    readonly emitsLight: boolean
  ) {
    const n = placements.length;

    this.bits = new Uint32Array(inst.buffer, inst.byteOffset, n * 4);
    this.hosts = new Array<LightHost | null>(n).fill(null);
    this.hostSince = new Float64Array(n);
    this.dirty = new Uint8Array(n);
    this.touched = new Uint8Array(n);
  }

  /** Opens a pack of every placement (the build, the snow poll). */
  beginFull(frame: LightFrame<P>): void {
    this.syncTouched(frame);
    this.maskVersion = frame.maskVersion;
    this.spareList.length = 0;
  }

  /** Packs one placement inside `beginFull` / `endFull`; true when it changed. */
  packFull(i: number, frame: LightFrame<P>): boolean {
    const changed = this.packOne(i, frame);
    if (this.dirty[i] === 1) this.spareList.push(i);
    return changed;
  }

  endFull(): void {
    this.swapDirty();
  }

  packAll(frame: LightFrame<P>): boolean {
    this.beginFull(frame);

    let changed = false;
    for (let i = 0; i < this.placements.length; i++) {
      if (this.packFull(i, frame)) changed = true;
    }

    this.endFull();
    return changed;
  }

  /**
   * The frame's pass over a chunk whose cell is on; true when a value changed
   * and the chunk's buffers need their upload.
   */
  update(frame: LightFrame<P>, box: LightBox): boolean {
    const force = this.skipped;
    this.skipped = false;

    // Tiers >= 1 never re-pack a chunk without carriers: it keeps its build.
    if (!frame.classic && !this.lit) return false;

    this.syncTouched(frame);

    const stale = frame.snow && this.maskVersion !== frame.maskVersion;

    return this.lit
      ? this.updateLit(frame, box, force, stale)
      : this.updateUnlit(frame, box, force, stale);
  }

  private updateLit(
    frame: LightFrame<P>,
    box: LightBox,
    force: boolean,
    stale: boolean
  ): boolean {
    const { placements, hosts, dirty, touched } = this;
    const list = candidates;
    list.length = 0;

    let litNow = false;

    for (let i = 0; i < placements.length; i++) {
      const host = readyHost(placements[i]);
      if (host !== null) litNow = true;

      // A carrier with a source stays dirty for as long as it stands.
      if (dirty[i] === 1 || touched[i] === 1 || host !== hosts[i]) {
        list.push(i);
      }
    }

    const lit = litNow || this.litLastFrame;
    this.litLastFrame = litNow;

    if (list.length === 0 && !stale) return false;
    if (!force && !lit && !(frame.classic && frame.reaches(box))) return false;
    if (stale) return this.packAll(frame);

    let changed = false;
    for (let k = 0; k < list.length; k++) {
      if (this.packOne(list[k], frame)) changed = true;
    }

    return changed;
  }

  private updateUnlit(
    frame: LightFrame<P>,
    box: LightBox,
    force: boolean,
    stale: boolean
  ): boolean {
    const { touchedList, dirtyList, touched, dirty } = this;

    if (touchedList.length === 0 && dirtyList.length === 0 && !stale) {
      return false;
    }
    if (!force && !frame.reaches(box)) return false;
    if (stale) return this.packAll(frame);

    const next = this.spareList;
    next.length = 0;

    let changed = false;

    for (let k = 0; k < touchedList.length; k++) {
      const i = touchedList[k];
      if (this.packOne(i, frame)) changed = true;
      if (dirty[i] === 1) next.push(i);
    }

    for (let k = 0; k < dirtyList.length; k++) {
      const i = dirtyList[k];
      if (touched[i] === 1) continue;
      if (this.packOne(i, frame)) changed = true;
      if (dirty[i] === 1) next.push(i);
    }

    this.swapDirty();
    return changed;
  }

  private packOne(i: number, frame: LightFrame<P>): boolean {
    const p = this.placements[i];
    const host = readyHost(p);

    frame.pack(p, host, packed);

    const bits = this.bits;
    const o = i * 4;
    let changed = false;

    for (let c = 0; c < 4; c++) {
      if (bits[o + c] !== packedBits[c]) {
        bits[o + c] = packedBits[c];
        changed = true;
      }
    }

    if (host !== this.hosts[i]) {
      this.hosts[i] = host;
      this.hostSince[i] = frame.serial;
    }

    // A carrier's `Light` is `RenderSystem`'s terrain + SelfLight, written
    // after this pass: through the update it turns Ready in, it is (1, 1, 1).
    this.dirty[i] =
      this.touched[i] === 1 ||
      (host !== null &&
        (this.emitsLight || this.hostSince[i] === frame.serial))
        ? 1
        : 0;

    return changed;
  }

  private swapDirty(): void {
    const next = this.spareList;
    this.spareList = this.dirtyList;
    this.dirtyList = next;
  }

  private syncTouched(frame: LightFrame<P>): void {
    if (this.touchedVersion === frame.touchedVersion) return;
    this.touchedVersion = frame.touchedVersion;

    const { placements, touched } = this;
    const list = this.touchedList;
    list.length = 0;

    for (let i = 0; i < placements.length; i++) {
      const pos = placements[i].pos;

      if (frame.touches(pos.x, pos.z)) {
        touched[i] = 1;
        list.push(i);
      } else {
        touched[i] = 0;
      }
    }
  }
}
