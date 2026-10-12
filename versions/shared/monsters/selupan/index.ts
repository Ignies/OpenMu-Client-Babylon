import { defineMonster } from '@/controllers/monsters';
import { SELUPAN_FX } from './bodyFx';

/** `(int)WorldTime % 10000 * 0.0002f`: mesh 5's scroll, both ways. */
const scroll = (ms: number) => (Math.floor(ms) % 10000) * 0.0002;

/** serufanarm_R over mesh 0 at `(sinf(WorldTime * 0.002f) + 1) * 0.5`, as its BlendMeshLight. */
const arm = {
  mesh: 0,
  kind: 'add',
  texture: 'Monster/serufanarm_R.OZJ',
  clamp: true,
  gain: (ms: number) => (Math.sin(ms * 0.002) + 1) * 0.5,
} as const;

export default defineMonster({
  Numb: 459,
  Name: 'Selupan',
  maxHealth: 4800000,
  // MODEL_SELUPAN: see `bodyFx.ts`.
  bodyFx: SELUPAN_FX,
  // RenderMonster (GM_Raklion.cpp:1504-1549). Not here: the pattern-2 Magic_b and CHROME4 passes over mesh 1
  // (:1534-1540), which wait on the Raklion battle state (`m_byDetailState`).
  passes: {
    passes: [
      { mesh: 3, kind: 'bright' },
      { mesh: 5, kind: 'bright', u: scroll, v: scroll },
      { mesh: 4, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4' },
      arm,
      arm,
      arm,
      arm,
      { mesh: 3, kind: 'add' },
    ],
  },
  model: { type: 150, scale: 2 },
});
