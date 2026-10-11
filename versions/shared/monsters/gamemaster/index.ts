import { defineMonster } from '@/controllers/monsters';
import { GAME_MASTER_FX } from './bodyFx';

export default defineMonster({
  Numb: 378,
  Name: 'GameMaster',
  // MODEL_GM_CHARACTER's aura: see `bodyFx.ts`.
  bodyFx: GAME_MASTER_FX,
  // A player rig in one body part (`c->Object.SubType`, ZzzCharacter.cpp:13954-13977; model ZzzOpenData.cpp:3936-3989).
  transformed: { dir: 'Skill/', part: 'youngza.glb', scale: 1 },
});
