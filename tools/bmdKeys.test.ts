import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { locksPositions } from './bmdKeys';

/** The first clip's sample count and one bone's rotation at every sample, from a GLB's own JSON and buffer. */
function clipOf(file: string, bone: string): { samples: number; rotations: number[][] } {
  const buf = readFileSync(join(process.cwd(), file));
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  const bin = 20 + len + 8;
  const read = (index: number, comps: number): number[][] => {
    const a = json.accessors[index];
    const view = json.bufferViews[a.bufferView];
    const base = bin + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const stride = view.byteStride ?? comps * 4;
    return Array.from({ length: a.count }, (_, i) =>
      Array.from({ length: comps }, (_, c) => Number(buf.readFloatLE(base + i * stride + c * 4).toFixed(3)))
    );
  };
  const clip = json.animations[0];
  const channel = clip.channels.find(
    (ch: { target: { node: number; path: string } }) => json.nodes[ch.target.node].name.endsWith(bone) && ch.target.path === 'rotation'
  );
  const sampler = clip.samplers[channel.sampler];
  return { samples: json.accessors[sampler.input].count, rotations: read(sampler.output, 4) };
}

// Models[MODEL_WARCRAFT].Actions[0].LockPositions = false (ZzzOpenData.cpp:4242): the gate's clip reaches key
// 10, the doors open at 90 degrees, which the file marks as a loop-closing duplicate.
describe('a clip the original unlocks at load', () => {
  it('is the Kalima gate only', () => {
    expect([locksPositions('Skill/HellGate.glb', 0, true), locksPositions('Player/Player.glb', 0, true)]).toEqual([false, true]);
  });

  it('keeps its last key in the converted gate', () => {
    const { samples, rotations } = clipOf('public/game-assets/Skill/HellGate.glb', 'Box05');
    // 11 keys and the wrap back to key 0.
    expect(samples).toBe(12);
    expect(rotations[10]).not.toEqual(rotations[0]);
    expect(rotations[11]).toEqual(rotations[0]);
  });
});
