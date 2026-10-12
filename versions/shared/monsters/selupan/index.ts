import { defineMonster, lookState } from '@/controllers/monsters';
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

/** `m_byDetailState >= BATTLE_OF_SELUPAN_PATTERN_2` (GM_Raklion.cpp:1537, GM_Raklion.h:39). */
const pattern2 = () => lookState('raklionSelupan') >= 3;

export default defineMonster({
  Numb: 459,
  Name: 'Selupan',
  maxHealth: 4800000,
  // MODEL_SELUPAN: see `bodyFx.ts`.
  bodyFx: SELUPAN_FX,
  // RenderMonster (GM_Raklion.cpp:1504-1549); the two mesh 1 passes from pattern 2 on (:1537-1543).
  passes: {
    passes: [
      { mesh: 3, kind: 'bright' },
      { mesh: 5, kind: 'bright', u: scroll, v: scroll },
      { mesh: 4, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4' },
      arm,
      arm,
      arm,
      arm,
      { mesh: 1, kind: 'add', texture: 'Effect/magic_b.OZJ', clamp: true, map: 'chrome6', when: pattern2 },
      { mesh: 1, kind: 'add', texture: 'Effect/Chrome02.OZJ', clamp: true, map: 'chrome4', when: pattern2 },
      { mesh: 3, kind: 'add' },
    ],
  },
  model: { type: 150, scale: 2 },
});
