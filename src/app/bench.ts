import { EngineInstrumentation } from '@babylonjs/core/Instrumentation/engineInstrumentation';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { CharacterClassNumber } from '@/core/types';
import type { Entity } from '@/ecs/world';
import { Ecs } from '@/ecs/current';
import { spawnPlayer } from '@/modules/scope/net';
import { addNpcToScope, resumeWalkIntoScope } from '@/modules/scope/objects';
import { noteScopeEntry } from '@/ecs/systems/teleportSystem';
import { systemTimesSnapshot } from '@/controllers/render/perfOverlay';
import { framePacer } from '@/controllers/render/fpsLimit';
import { Loading } from '@/controllers/loading';
import { GameOptions, setGameOption } from '@/controllers/settings';
import { applyTierPreset, TIER_PRESETS } from '@versions/shared/ui/windows/options/presets';
import { devQuery, devQueryNumber } from '@/core/devSeams';

/**
 * `?offline&bench` (ours, a dev-build measurement seam: `core/devSeams.ts` reads nothing in production): a repeatable run on the
 * offline map. The hero walks a fixed loop, `players=N` other players and `monsters=M` monsters
 * are spawned around him and wander (seeded, so two runs match), then `seconds=S` (30) of frames
 * are timed and a table is printed (the panel, the console `[bench]` line, `window.__bench`).
 * `?bench&players=100&monsters=40&seconds=30`. `&preset=0` applies a quality preset (0 Low .. 3 Ultra,
 * the Options buttons) and `&set=glow:0,shadows:false` any options, for an A/B; they are saved like
 * a click in the Options window. See docs/guidelines/performance.md.
 */

const param = (name: string, fallback: number): number => {
  const n = devQueryNumber(name);
  return n !== null && n > 0 ? n : fallback;
};

/** mulberry32: the same crowd every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLASSES = [
  CharacterClassNumber.DarkWizard,
  CharacterClassNumber.SoulMaster,
  CharacterClassNumber.DarkKnight,
  CharacterClassNumber.BladeKnight,
  CharacterClassNumber.FairyElf,
  CharacterClassNumber.MuseElf,
];
/** Lorencia's monsters: Bull Fighter, Hound, Budge Dragon, Spider. */
const MONSTERS = [0, 1, 2, 3];
const BENCH_ID_BASE = 24000;

/** Fixed walk loop around the hero, tiles from where he stands. */
const HERO_LOOP: readonly (readonly [number, number])[] = [
  [8, 0], [8, 8], [0, 8], [-8, 8], [-8, 0], [-8, -8], [0, -8], [8, -8],
];

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

type Placed = Entity & Required<Pick<Entity, 'transform' | 'playerMoveTo'>>;

function spawnCrowd(world: NonNullable<typeof Ecs.world>, hero: Placed, players: number, monsters: number, rand: () => number) {
  const cx = hero.transform.pos.x;
  const cz = hero.transform.pos.z;
  const walkers: { e: Entity; x: number; z: number }[] = [];
  const spot = (): [number, number] => [Math.round(cx + (rand() - 0.5) * 36), Math.round(cz + (rand() - 0.5) * 36)];
  const set = () => Math.floor(rand() * 17);
  const gear = (group: number, num: number) => ({ group, num, lvl: Math.floor(rand() * 10), isExcellent: rand() < 0.2 });

  for (let i = 0; i < players; i++) {
    const cls = CLASSES[i % CLASSES.length];
    const p = spawnPlayer(world, { cls });
    const [x, z] = spot();
    world.addComponent(p, 'netId', BENCH_ID_BASE + i);
    world.addComponent(p, 'worldIndex', world.mapIndex);
    noteScopeEntry(p);
    p.transform.pos.set(x, world.getTerrainHeight(x, z), z);
    p.objectNameInWorld = `Bench${i}`;
    world.addComponent(p, 'interactable', true);
    const s = set();
    const a = p.charAppearance;
    a.helm = gear(7, s);
    a.armor = gear(8, s);
    a.pants = gear(9, s);
    a.gloves = gear(10, s);
    a.boots = gear(11, s);
    a.rightHand = gear(rand() < 0.5 ? 0 : 2, Math.floor(rand() * 12));
    a.leftHand = rand() < 0.4 ? gear(6, Math.floor(rand() * 8)) : null;
    a.wings = rand() < 0.3 ? gear(12, Math.floor(rand() * 7)) : null;
    a.pet = rand() < 0.1 ? gear(13, 0) : null;
    a.changed = true;
    walkers.push({ e: p, x, z });
  }

  for (let i = 0; i < monsters; i++) {
    const [x, z] = spot();
    const e = addNpcToScope(world, {
      Id: BENCH_ID_BASE + 2000 + i,
      TypeNumber: MONSTERS[i % MONSTERS.length],
      CurrentPositionX: x,
      CurrentPositionY: z,
      TargetPositionX: x,
      TargetPositionY: z,
      Rotation: Math.floor(rand() * 8),
    });
    walkers.push({ e, x, z });
  }
  return walkers;
}

export function startBench(): void {
  const world = Ecs.world;
  if (!world) return;
  const preset = TIER_PRESETS[Number(devQuery('preset') ?? NaN)];
  if (preset) applyTierPreset(preset);
  for (const pair of (devQuery('set') ?? '').split(',')) {
    const [key, raw] = pair.split(':');
    if (key in GameOptions) setGameOption(key as keyof typeof GameOptions, (raw === 'true' ? true : raw === 'false' ? false : Number(raw)) as never);
  }
  const entityCount = () => [...world.entities].length;
  const seconds = param('seconds', 30);
  const players = param('players', 0);
  const monsters = param('monsters', 0);
  const rand = rng(param('seed', 1));
  const scene = world.scene;
  const engine = scene.getEngine();

  const panel = document.createElement('pre');
  panel.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;margin:0;padding:8px 10px;background:rgba(0,0,0,.78);color:#ffe9a8;font:11px/1.35 ui-monospace,monospace;pointer-events:none';
  document.body.appendChild(panel);
  const say = (s: string) => (panel.textContent = `BENCH  players ${players}  monsters ${monsters}  ${seconds}s\n${s}`);

  const ready = () => {
    const hero = world.playerEntity;
    return !!world.terrain && !Loading.sceneLoading && !!hero?.modelObject?.Ready;
  };

  const waitLoaded = (list: Entity[], then: () => void) => {
    const t0 = performance.now();
    const timer = setInterval(() => {
      const done = list.filter(e => e.modelObject?.Ready).length;
      say(`loading crowd ${done}/${list.length}`);
      if (done >= list.length * 0.98 || performance.now() - t0 > 120000) {
        clearInterval(timer);
        setTimeout(then, 4000);
      }
    }, 500);
  };

  const boot = setInterval(() => {
    if (!ready()) return say('waiting for the map');
    clearInterval(boot);
    const hero = world.playerEntity as Placed;
    const walkers = spawnCrowd(world, hero, players, monsters, rand);
    waitLoaded([hero, ...walkers.map(w => w.e)], () => run(hero, walkers));
  }, 500);

  function run(hero: Placed, walkers: { e: Entity; x: number; z: number }[]) {
    const hx = Math.round(hero.transform.pos.x);
    const hz = Math.round(hero.transform.pos.z);
    let leg = 0;
    const legTimer = setInterval(() => {
      const [dx, dz] = HERO_LOOP[leg++ % HERO_LOOP.length];
      hero.playerMoveTo.point.x = hx + dx;
      hero.playerMoveTo.point.y = hz + dz;
      hero.playerMoveTo.handled = false;
    }, 3500);
    const wander = setInterval(() => {
      for (const w of walkers) {
        if (rand() > 0.35) continue;
        const nx = Math.round(w.x + (rand() - 0.5) * 8);
        const nz = Math.round(w.z + (rand() - 0.5) * 8);
        resumeWalkIntoScope(w.e, w.x, w.z, nx, nz);
        w.x = nx;
        w.z = nz;
      }
    }, 2500);

    // The overlay's per-system column is read at the end, so it has to be on.
    window.dispatchEvent(new KeyboardEvent('keydown', { shiftKey: true, ctrlKey: true, altKey: true, code: 'KeyP' }));
    const gpu = new EngineInstrumentation(engine);
    gpu.captureGPUFrameTime = true;
    const si = new SceneInstrumentation(scene);
    si.captureFrameTime = si.captureRenderTime = si.captureActiveMeshesEvaluationTime = si.captureRenderTargetsRenderTime = true;
    si.captureAnimationsTime = si.captureParticlesRenderTime = si.captureSpritesRenderTime = true;

    const wall: number[] = [], cpu: number[] = [], gpums: number[] = [], calls: number[] = [], act: number[] = [], tris: number[] = [], bones: number[] = [];
    const ph = { render: [] as number[], active: [] as number[], targets: [] as number[], anim: [] as number[], particles: [] as number[] };
    let t0 = 0, lastBegin = 0, lastFrame = -1;
    const drawCalls = () => (engine as unknown as { _drawCalls: { current: number } })._drawCalls.current;
    const begin = engine.onBeginFrameObservable.add(() => (t0 = performance.now()));
    const end = engine.onEndFrameObservable.add(() => {
      const f = scene.getFrameId();
      if (f === lastFrame) return;
      lastFrame = f;
      // The scene instrumentation restarts the counter every render: it reads as this frame's own.
      if (lastBegin > 0) {
        wall.push(t0 - lastBegin);
        cpu.push(performance.now() - t0);
        calls.push(drawCalls());
        act.push(scene.getActiveMeshes().length);
        tris.push(scene.getActiveIndices() / 3);
        bones.push(scene.getActiveBones());
        gpums.push((gpu.gpuFrameTimeCounter?.current ?? 0) / 1e6);
        ph.render.push(si.renderTimeCounter.current);
        ph.active.push(si.activeMeshesEvaluationTimeCounter.current);
        ph.targets.push(si.renderTargetsRenderTimeCounter.current);
        ph.anim.push(si.animationsTimeCounter.current);
        ph.particles.push(si.particlesRenderTimeCounter.current);
      }
      lastBegin = t0;
    });

    const started = performance.now();
    const tick = setInterval(() => {
      const left = seconds - (performance.now() - started) / 1000;
      say(`running ${Math.max(0, left).toFixed(0)}s  frames ${wall.length}`);
      if (left > 0) return;
      clearInterval(tick);
      clearInterval(legTimer);
      clearInterval(wander);
      engine.onBeginFrameObservable.remove(begin);
      engine.onEndFrameObservable.remove(end);
      finish();
    }, 500);

    function finish() {
      const w = [...wall].sort((a, b) => a - b);
      const c = [...cpu].sort((a, b) => a - b);
      const g = gpums.filter(v => v > 0).sort((a, b) => a - b);
      const sys = systemTimesSnapshot();
      // What the frame draws, by kind: skinned bodies (and their blob-shadow clones), batched props, the rest.
      const am = scene.getActiveMeshes();
      let skinnedActive = 0, shadowActive = 0, batchedActive = 0, instances = 0, plainActive = 0;
      for (let i = 0; i < am.length; i++) {
        const m = am.data[i] as import('@babylonjs/core/Meshes/mesh').Mesh;
        if (m.skeleton) {
          skinnedActive++;
          if (m.name.includes('_shadow')) shadowActive++;
        } else if (m.thinInstanceCount > 0) {
          batchedActive++;
          instances += m.thinInstanceCount;
        } else plainActive++;
      }
      let skinned = 0;
      for (const m of scene.meshes) if (m.skeleton) skinned++;
      let playing = 0;
      for (const ag of scene.animationGroups) if (ag.isPlaying) playing++;
      const r = {
        frames: wall.length,
        fpsAvg: +(1000 / avg(wall)).toFixed(1),
        wallMs: { avg: +avg(wall).toFixed(2), p50: +pct(w, 0.5).toFixed(2), p95: +pct(w, 0.95).toFixed(2), p99: +pct(w, 0.99).toFixed(2), max: +w[w.length - 1].toFixed(1) },
        over16_7: +((w.filter(v => v > 18.3).length / w.length) * 100).toFixed(1),
        over33: +((w.filter(v => v > 36.6).length / w.length) * 100).toFixed(1),
        cpuMs: { avg: +avg(cpu).toFixed(2), p95: +pct(c, 0.95).toFixed(2), max: +c[c.length - 1].toFixed(1) },
        gpuMs: g.length ? { avg: +avg(g).toFixed(2), p95: +pct(g, 0.95).toFixed(2) } : null,
        phasesMs: { render: +avg(ph.render).toFixed(2), activeMeshes: +avg(ph.active).toFixed(2), renderTargets: +avg(ph.targets).toFixed(2), animations: +avg(ph.anim).toFixed(2), particles: +avg(ph.particles).toFixed(2) },
        drawCalls: { avg: +avg(calls).toFixed(0), max: Math.max(...calls) },
        activeMeshes: +avg(act).toFixed(0),
        activeKinds: { skinned: skinnedActive, ofThemShadowClones: shadowActive, batchedProps: batchedActive, propInstances: instances, plain: plainActive },
        tris: +avg(tris).toFixed(0),
        activeBones: +avg(bones).toFixed(0),
        scene: { meshes: scene.meshes.length, skinnedMeshes: skinned, skeletons: scene.skeletons.length, materials: scene.materials.length, textures: scene.textures.length, lights: scene.lights.length, particleSystems: scene.particleSystems.length, clipsPlaying: playing, entities: entityCount() },
        pacerFps: +framePacer.fps.toFixed(1),
        systems: sys.slice(0, 12),
      };
      (window as unknown as { __bench: unknown }).__bench = r;
      console.info('[bench] ' + JSON.stringify(r));
      say(
        `fps ${r.fpsAvg}  wall ms p50 ${r.wallMs.p50} p95 ${r.wallMs.p95} p99 ${r.wallMs.p99} max ${r.wallMs.max}\n` +
          `frames over 16.7: ${r.over16_7}%   over 33: ${r.over33}%\n` +
          `cpu ms avg ${r.cpuMs.avg} p95 ${r.cpuMs.p95}   gpu ms ${r.gpuMs ? `avg ${r.gpuMs.avg} p95 ${r.gpuMs.p95}` : 'n/a'}\n` +
          `draw calls ${r.drawCalls.avg} (max ${r.drawCalls.max})  active meshes ${r.activeMeshes} (skinned ${skinnedActive}, shadow ${shadowActive}, batched ${batchedActive}, plain ${plainActive})  tris ${r.tris}  bones ${r.activeBones}\n` +
          `render ${r.phasesMs.render}  activeEval ${r.phasesMs.activeMeshes}  targets ${r.phasesMs.renderTargets}  anim ${r.phasesMs.animations}  particles ${r.phasesMs.particles}\n` +
          sys.slice(0, 8).map(s => `${s.name.padEnd(26)}${s.ms.toFixed(2)}  peak ${s.peak.toFixed(1)}`).join('\n')
      );
      gpu.dispose();
      si.dispose();
    }
  }
}
