import { defineMonster } from '@/controllers/monsters';
import { CHROME01 } from '@/controllers/item_fx/itemLooks';
import { LUCAS_FX } from './bodyFx';

export default defineMonster({
  Numb: 507,
  Name: 'Erkanne',
  maxHealth: 1200000,
  // MODEL_LUCAS: see `bodyFx.ts`.
  bodyFx: LUCAS_FX,
  // RenderMonster (GMEmpireGuardian1.cpp:1846-1866): meshes 0-4 lit and Chrome01 over mesh 3.
  passes: { passes: [{ mesh: 3, kind: 'add', ...CHROME01 }], drawn: [0, 1, 2, 3, 4] },
  model: { type: 167, scale: 1.25 },
});
