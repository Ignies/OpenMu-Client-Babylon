import { afterAll, describe, expect, it, vi } from 'vitest';
import type { LightingTier } from '../../lighting/lightingQuality';
import type { RoomVolume } from '../../lighting/profiles';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const bjs = await import('../babylon/exports');
const { syncRoomMask } = await import('./roomMask');
const fidelity = await import('../../fidelity');

const ROOM = { minX: 0, minY: 0, maxX: 4, maxY: 4, floorY: 0, wallTop: 3, roofY: 4 } as RoomVolume;

const engine = new NullEngine({ renderWidth: 512, renderHeight: 256, textureSize: 512, deterministicLockstep: false, lockstepMaxSteps: 1 });
const scene = new bjs.Scene(engine);
const camera = new bjs.ArcRotateCamera('cam', 0, 0, 10, bjs.Vector3.Zero(), scene);
afterAll(() => {
  syncRoomMask(scene, camera, null, null, false);
  engine.dispose();
});

// The pass reads its own depth map at the screen's UV: a map made at the size the window had when the
// room began, then upscaled, put the wall's depth on the floor beside it and blacked it (depthRenderer.js:84).
describe('the room mask depth map', () => {
  it('follows a window or render-scale resize on the next tick', () => {
    syncRoomMask(scene, camera, {} as LightingTier, ROOM, false);
    const depthMap = () => scene.enableDepthRenderer(camera, false, true, bjs.Texture.NEAREST_SAMPLINGMODE, true).getDepthMap();
    expect([depthMap().getRenderWidth(), depthMap().getRenderHeight()]).toEqual([512, 256]);

    const options = (engine as unknown as { _options: { renderWidth: number; renderHeight: number } })._options;
    options.renderWidth = 1280;
    options.renderHeight = 720;
    syncRoomMask(scene, camera, {} as LightingTier, ROOM, false);

    expect([depthMap().getRenderWidth(), depthMap().getRenderHeight()]).toEqual([1280, 720]);
  });
});

// The director asks every tick (lighting/director.ts): one kept answer, not a fresh object a call.
describe('the room mask answer', () => {
  it('is one kept object', () => {
    const first = syncRoomMask(scene, camera, null, null, false);
    expect(syncRoomMask(scene, camera, {} as LightingTier, ROOM, false)).toBe(first);
  });
});

// `openRooms` (versions/shared/improvements/open_rooms.ts): the town stays drawn around a room.
describe('the room mask under openRooms', () => {
  const masked = () => (camera._postProcesses ?? []).some(p => p?.name === 'roomMask');
  afterAll(() => fidelity.setFidelityChoice(fidelity.FIDELITY_DEFAULT, {}));

  it('is built on Classic and left out while the improvement is on', () => {
    fidelity.registerImprovements([{ id: 'openRooms', preset: 'ultra', labelKey: 'fidelity.openRooms', hintKey: 'fidelity.openRooms.hint' }]);
    fidelity.setFidelityChoice(fidelity.FIDELITY_CLASSIC, {});
    syncRoomMask(scene, camera, {} as LightingTier, ROOM, false);
    expect(masked()).toBe(true);

    fidelity.setFidelityChoice(fidelity.FIDELITY_ULTRA, {});
    syncRoomMask(scene, camera, {} as LightingTier, ROOM, false);
    expect(masked()).toBe(false);
  });
});
