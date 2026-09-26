import { describe, expect, it } from 'vitest';
import {
  ChunkLight,
  type LightBox,
  type LightFrame,
  type LightHost,
} from './propBatchLight';
import { TERRAIN_SIZE } from './terrain/consts';
import {
  initTerrainDynamicLight,
  registerTerrainLight,
  requestBodyTerrainLight,
  requestTerrainLight,
  terrainLightReaches,
  terrainLightTouchedVersion,
  terrainLightTouchesSample,
  updateTerrainDynamicLight,
  type TerrainLightEmitter,
} from './terrainDynamicLight';

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Host = {
  Ready: boolean;
  Light: { x: number; y: number; z: number };
  self: { x: number; y: number; z: number };
};

type Place = {
  pos: { x: number; y: number; z: number };
  entity: { modelObject?: Host };
};

type Kind = 'unlit' | 'sprite' | 'source';

type SimChunk = {
  readonly kind: Kind;
  readonly placements: Place[];
  readonly box: LightBox;
  readonly oldInst: Float32Array;
  readonly newInst: Float32Array;
  readonly light: ChunkLight<Place>;
  litLastFrame: boolean;
  enabled: boolean;
};

type Options = {
  seed: number;
  classic: boolean;
  frames: number;
  /** Emitters move, come and go, and the layer is switched off now and then. */
  churn: boolean;
  /** Emitter colours flicker. */
  flicker: boolean;
  /** Cells switch off and on. */
  cells: boolean;
  snow: boolean;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const LO = 40;
const HI = 104;
const CHUNK = 16;

/**
 * The whole-chunk rule (`propBatches.ts` under `?repackAll=1`) and
 * `ChunkLight` side by side over one world, frame by frame in
 * `createWorld`'s order: the loader, the batches, movement, the terrain
 * layer, `RenderSystem`. Every chunk whose cell is on must hold the same bits.
 */
function simulate(o: Options): { oldPacks: number; newPacks: number } {
  const random = rng(o.seed);
  const baked = new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3);
  for (let i = 0; i < baked.length; i++) baked[i] = 0.05 + random() * 1.1;
  initTerrainDynamicLight(baked);

  const closed = new Uint8Array(TERRAIN_SIZE * TERRAIN_SIZE);
  let maskVersion = 0;
  let polledMask = 0;

  const sampled = { x: 0, y: 0, z: 0 };
  const sample = (x: number, z: number) => {
    if (o.classic) requestTerrainLight(x, z, sampled);
    else requestBodyTerrainLight(x, z, sampled);
    return sampled;
  };

  const pack = (p: Place, host: LightHost | null, out: Float32Array) => {
    const light = host ? host.Light : sample(p.pos.x, p.pos.z);

    if (o.classic) {
      out[0] = Math.min(1, light.x);
      out[1] = Math.min(1, light.y);
      out[2] = Math.min(1, light.z);
    } else {
      const peak = Math.max(1, light.x, light.y, light.z);
      out[0] = light.x / peak;
      out[1] = light.y / peak;
      out[2] = light.z / peak;
    }

    const tile = Math.floor(p.pos.z) * TERRAIN_SIZE + Math.floor(p.pos.x);
    out[3] = o.snow && closed[tile] === 1 ? 0 : 1;
  };

  let oldPacks = 0;
  let newPacks = 0;
  const scratch = new Float32Array(4);

  const frame: LightFrame<Place> = {
    classic: o.classic,
    snow: o.snow,
    maskVersion: 0,
    touchedVersion: 0,
    serial: 0,
    touches: terrainLightTouchesSample,
    reaches: box =>
      terrainLightReaches(box.minX, box.minZ, box.maxX, box.maxZ),
    pack: (p, host, out) => {
      newPacks++;
      pack(p, host, out);
    },
  };

  const readyHost = (p: Place) =>
    p.entity.modelObject?.Ready === true ? p.entity.modelObject : null;

  const packOld = (chunk: SimChunk) => {
    for (let i = 0; i < chunk.placements.length; i++) {
      oldPacks++;
      pack(chunk.placements[i], readyHost(chunk.placements[i]), scratch);
      chunk.oldInst.set(scratch, i * 4);
    }
  };

  // Placements: three kinds, a few per chunk.
  const chunks: SimChunk[] = [];
  const kinds: Kind[] = ['unlit', 'sprite', 'source'];

  for (const kind of kinds) {
    for (let cz = LO; cz < HI; cz += CHUNK) {
      for (let cx = LO; cx < HI; cx += CHUNK) {
        const count = 3 + Math.floor(random() * 12);
        const placements: Place[] = [];
        let minX = Infinity;
        let minZ = Infinity;
        let maxX = -Infinity;
        let maxZ = -Infinity;

        for (let k = 0; k < count; k++) {
          const x = cx + random() * CHUNK;
          const z = cz + random() * CHUNK;
          placements.push({ pos: { x, y: 0, z }, entity: {} });
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }

        const oldInst = new Float32Array(count * 4);
        const newInst = new Float32Array(count * 4);

        chunks.push({
          kind,
          placements,
          box: { minX, minZ, maxX, maxZ },
          oldInst,
          newInst,
          light: new ChunkLight(
            placements,
            newInst,
            kind !== 'unlit',
            kind === 'source'
          ),
          litLastFrame: false,
          enabled: true,
        });
      }
    }
  }

  type Sim = {
    emitter: TerrainLightEmitter & {
      position: { x: number; y: number; z: number };
    };
    dispose: () => void;
    vx: number;
    vz: number;
  };
  const emitters: Sim[] = [];

  const addEmitter = () => {
    const base = {
      r: 0.3 + random(),
      g: 0.2 + random() * 0.8,
      b: random() * 0.6,
    };
    const emitter = {
      position: {
        x: LO + random() * (HI - LO),
        y: 0,
        z: LO + random() * (HI - LO),
      },
      range: 1 + Math.floor(random() * 4),
      color: () => {
        if (!o.flicker) return base;
        const k = 0.6 + random() * 0.6;
        return { r: base.r * k, g: base.g * k, b: base.b * k };
      },
    };

    emitters.push({
      emitter,
      dispose: registerTerrainLight(emitter),
      vx: (random() - 0.5) * 0.6,
      vz: (random() - 0.5) * 0.6,
    });
  };

  const removeEmitter = () => {
    if (emitters.length === 0) return;
    const [gone] = emitters.splice(Math.floor(random() * emitters.length), 1);
    gone.dispose();
  };

  for (let n = 0; n < 6; n++) addEmitter();
  updateTerrainDynamicLight(0);

  const hero = { x: (LO + HI) / 2, z: (LO + HI) / 2 };
  const CARRIER_RADIUS = 14;

  const render = () => {
    for (const chunk of chunks) {
      for (const p of chunk.placements) {
        const host = p.entity.modelObject;
        if (!host) continue;

        if (chunk.kind === 'source' && random() < 0.7) {
          host.self = {
            x: random() * 0.5,
            y: random() * 0.3,
            z: random() * 0.1,
          };
        }

        const light = sample(p.pos.x, p.pos.z);
        host.Light = {
          x: light.x + host.self.x,
          y: light.y + host.self.y,
          z: light.z + host.self.z,
        };
      }
    }
  };

  // ModelLoaderSystem: carriers come and go with the hero's radius; a new
  // one is Ready at once with the default light.
  const loadCarriers = () => {
    for (const chunk of chunks) {
      if (chunk.kind === 'unlit') continue;
      for (const p of chunk.placements) {
        const near =
          (p.pos.x - hero.x) ** 2 + (p.pos.z - hero.z) ** 2 <
          CARRIER_RADIUS ** 2;
        if (near && !p.entity.modelObject) {
          p.entity.modelObject = {
            Ready: true,
            Light: { x: 1, y: 1, z: 1 },
            self: { x: 0, y: 0, z: 0 },
          };
        } else if (!near && p.entity.modelObject) {
          p.entity.modelObject.Ready = false;
          delete p.entity.modelObject;
        }
      }
    }
  };

  // The build, with carriers already standing: every placement packed on
  // both sides, then the build frame's terrain layer and RenderSystem.
  loadCarriers();
  frame.touchedVersion = terrainLightTouchedVersion();
  frame.maskVersion = maskVersion;
  for (const chunk of chunks) {
    packOld(chunk);
    chunk.light.packAll(frame);
  }
  updateTerrainDynamicLight(8);
  render();

  for (let f = 1; f <= o.frames; f++) {
    loadCarriers();

    if (o.churn && random() < 0.05) removeEmitter();

    if (o.snow && random() < 0.08) {
      const x = LO + Math.floor(random() * (HI - LO));
      const z = LO + Math.floor(random() * (HI - LO));
      if (closed[z * TERRAIN_SIZE + x] === 0) {
        closed[z * TERRAIN_SIZE + x] = 1;
        maskVersion++;
      }
    }

    // PropBatchSystem.
    frame.serial = f;
    frame.touchedVersion = terrainLightTouchedVersion();
    frame.maskVersion = maskVersion;

    for (const chunk of chunks) {
      if (o.classic || chunk.kind !== 'unlit') {
        let repack =
          o.classic &&
          terrainLightReaches(
            chunk.box.minX,
            chunk.box.minZ,
            chunk.box.maxX,
            chunk.box.maxZ
          );

        if (chunk.kind !== 'unlit') {
          const litNow = chunk.placements.some(
            p => p.entity.modelObject?.Ready === true
          );
          if (litNow || chunk.litLastFrame) repack = true;
          chunk.litLastFrame = litNow;
        }

        if (repack) packOld(chunk);
      }

      if (!chunk.enabled) chunk.light.skipped = true;
      else chunk.light.update(frame, chunk.box);
    }

    if (o.snow && f % 8 === 0 && maskVersion !== polledMask) {
      polledMask = maskVersion;
      for (const chunk of chunks) {
        packOld(chunk);
        chunk.light.packAll(frame);
      }
    }

    for (const chunk of chunks) {
      if (!chunk.enabled) continue;
      const a = new Uint32Array(chunk.oldInst.buffer);
      const b = new Uint32Array(chunk.newInst.buffer);
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          throw new Error(
            `frame ${f}, ${chunk.kind} chunk at ${chunk.box.minX.toFixed(1)},` +
              `${chunk.box.minZ.toFixed(1)}: float ${i} is ${chunk.oldInst[i]} ` +
              `whole, ${chunk.newInst[i]} per placement`
          );
        }
      }
    }

    if (o.cells) {
      for (const chunk of chunks) {
        if (random() < 0.08) chunk.enabled = !chunk.enabled;
      }
    }

    // Movement.
    hero.x = clamp(hero.x + (random() - 0.5) * 1.5, LO + 4, HI - 4);
    hero.z = clamp(hero.z + (random() - 0.5) * 1.5, LO + 4, HI - 4);

    if (o.churn) {
      for (const e of emitters) {
        const at = e.emitter.position;
        at.x = clamp(at.x + e.vx, LO, HI);
        at.z = clamp(at.z + e.vz, LO, HI);
      }
      if (random() < 0.05) removeEmitter();
      if (random() < 0.1) addEmitter();
    }

    // TerrainLightSystem, then RenderSystem.
    updateTerrainDynamicLight(f * 16, !o.churn || random() > 0.03);
    render();
  }

  while (emitters.length > 0) removeEmitter();
  updateTerrainDynamicLight(0);

  return { oldPacks, newPacks };
}

describe('ChunkLight', () => {
  for (const classic of [true, false]) {
    const tier = classic ? 'Classic' : 'tiers >= 1';

    it(`holds exactly what the whole-chunk re-pack holds, ${tier}`, () => {
      for (const seed of [1, 2, 3]) {
        const { oldPacks, newPacks } = simulate({
          seed,
          classic,
          frames: 300,
          churn: true,
          flicker: true,
          cells: false,
          snow: seed === 3,
        });

        expect(newPacks).toBeLessThan(oldPacks);
      }
    });

    it(`catches a chunk up when its cell comes back on, ${tier}`, () => {
      for (const seed of [4, 5]) {
        simulate({
          seed,
          classic,
          frames: 300,
          churn: false,
          // With the torches still, a stale value is one the whole-chunk rule
          // would have kept too; on tiers >= 1 that needs a steady colour.
          flicker: classic,
          cells: true,
          snow: false,
        });
      }
    });
  }

  it('stops packing a sprite-only carrier once its light has settled', () => {
    initTerrainDynamicLight(
      new Float32Array(TERRAIN_SIZE * TERRAIN_SIZE * 3).fill(0.4)
    );
    updateTerrainDynamicLight(0);

    const host: Host = {
      Ready: true,
      Light: { x: 1, y: 1, z: 1 },
      self: { x: 0, y: 0, z: 0 },
    };
    const placements: Place[] = [
      { pos: { x: 50.5, y: 0, z: 50.5 }, entity: { modelObject: host } },
      { pos: { x: 52.5, y: 0, z: 50.5 }, entity: {} },
    ];
    const inst = new Float32Array(8);
    const light = new ChunkLight(placements, inst, true, false);
    const packed: Place[] = [];
    const frame: LightFrame<Place> = {
      classic: false,
      snow: false,
      maskVersion: 0,
      touchedVersion: terrainLightTouchedVersion(),
      serial: 0,
      touches: terrainLightTouchesSample,
      reaches: () => false,
      pack: (p, h, out) => {
        packed.push(p);
        const l = h ? h.Light : { x: 0.4, y: 0.4, z: 0.4 };
        out.set([l.x, l.y, l.z, 1]);
      },
    };

    const box = { minX: 50, minZ: 50, maxX: 53, maxZ: 51 };

    // The build and the same update's pass both see the default light.
    light.packAll(frame);
    expect(light.update(frame, box)).toBe(false);
    expect(Array.from(inst.subarray(0, 4))).toEqual([1, 1, 1, 1]);
    frame.serial++;

    // RenderSystem writes the terrain light onto the carrier.
    host.Light = { x: 0.4, y: 0.4, z: 0.4 };
    packed.length = 0;
    expect(light.update(frame, box)).toBe(true);
    expect(packed).toEqual([placements[0]]);
    expect(inst[0]).toBeCloseTo(0.4);
    frame.serial++;

    packed.length = 0;
    expect(light.update(frame, box)).toBe(false);
    expect(packed).toEqual([]);
    frame.serial++;

    // It goes: one pass back to the terrain.
    delete placements[0].entity.modelObject;
    expect(light.update(frame, box)).toBe(false);
    expect(packed).toEqual([placements[0]]);
  });

  it('re-packs what may have moved when its cell comes back on', () => {
    const placements: Place[] = [
      { pos: { x: 50.5, y: 0, z: 50.5 }, entity: {} },
      { pos: { x: 58.5, y: 0, z: 50.5 }, entity: {} },
    ];
    const inst = new Float32Array(8);
    const light = new ChunkLight(placements, inst, false, false);
    let torch = 0.5;
    let touched = true;
    let reached = true;
    const frame: LightFrame<Place> = {
      classic: true,
      snow: false,
      maskVersion: 0,
      touchedVersion: 1,
      serial: 0,
      touches: x => touched && x < 55,
      reaches: () => reached,
      pack: (p, _h, out) => {
        const v = p.pos.x < 55 ? 0.2 + torch : 0.2;
        out.set([v, v, v, 1]);
      },
    };
    const box = { minX: 50, minZ: 50, maxX: 59, maxZ: 51 };

    light.packAll(frame);
    expect(inst[0]).toBeCloseTo(0.7);

    // The torch goes out while the cell is off, and no longer reaches it.
    light.skipped = true;
    torch = 0;
    touched = false;
    reached = false;
    frame.touchedVersion = 2;

    expect(light.update(frame, box)).toBe(true);
    expect(inst[0]).toBeCloseTo(0.2);

    // Visited while on, a chunk the torch no longer reaches is left alone.
    torch = 0.5;
    expect(light.update(frame, box)).toBe(false);
  });

  it('never re-packs a chunk without carriers on tiers >= 1', () => {
    const placements: Place[] = [
      { pos: { x: 50.5, y: 0, z: 50.5 }, entity: {} },
    ];
    const light = new ChunkLight(placements, new Float32Array(4), false, false);
    let packs = 0;
    const frame: LightFrame<Place> = {
      classic: false,
      snow: true,
      maskVersion: 1,
      touchedVersion: 1,
      serial: 0,
      touches: () => true,
      reaches: () => true,
      pack: (_p, _h, out) => {
        packs++;
        out.set([packs, packs, packs, 1]);
      },
    };

    light.packAll(frame);
    light.skipped = true;
    frame.maskVersion = 2;
    frame.touchedVersion = 2;

    const box = { minX: 50, minZ: 50, maxX: 51, maxZ: 51 };
    expect(light.update(frame, box)).toBe(false);
    expect(packs).toBe(1);
  });
});
