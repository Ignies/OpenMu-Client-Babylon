import { defineMonster } from '@/controllers/monsters';
import { DARK_GHOST_FX } from './bodyFx';

export default defineMonster({
  Numb: 515,
  Name: 'Grand Wizard',
  maxHealth: 100000,
  // MODEL_DARK_GHOST: see `bodyFx.ts`.
  bodyFx: DARK_GHOST_FX,
  // RenderMonster (GMEmpireGuardian2.cpp:833-847): meshes 0-2 lit and mesh 3 bright at BlendMeshLight 0.5. Not
  // here: the BodyLight (0.3, 1, 0.2) its Die sets (:835-838).
  passes: { passes: [{ mesh: 3, kind: 'bright', gain: () => 0.5 }], drawn: [0, 1, 2, 3] },
  model: { type: 175, scale: 1.3 },
});
