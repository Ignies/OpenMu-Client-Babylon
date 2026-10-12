import { defineMonster } from '@/controllers/monsters';
import { CHROME01 } from '@/controllers/item_fx/itemLooks';
import { rageSmoke } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 506,
  Name: 'Raymond',
  maxHealth: 1600000,
  // Raymond's rage smoke under eBuff_Berserker (_shared/bodyFx.ts).
  bodyFx: [rageSmoke(61)],
  // RenderMonster (GMEmpireGuardian1.cpp:1831-1845): raymond_sword_R over mesh 1 in `BodyLight[0] * 3` grey at
  // `(sinf(WorldTime * 0.003f) + 1) * 0.5`, and Chrome01 over mesh 3.
  passes: {
    passes: [
      {
        mesh: 1,
        kind: 'add',
        texture: 'Effect/raymond_sword_R.OZJ',
        light: (_ms, body, out) => out.set(body.x * 3, body.x * 3, body.x * 3),
        gain: ms => (Math.sin(ms * 0.003) + 1) * 0.5,
      },
      { mesh: 3, kind: 'add', ...CHROME01 },
    ],
  },
  model: { type: 166, scale: 1.45 },
});
