import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { blur } from '../_shared/bodyFx';

export default defineMonster({
  Numb: 340,
  Name: 'Dark Elf',
  // RenderObject's Attack1 / Attack2 trail along his weapon's LinkBone 33 (GMCrywolf1st.cpp:1254-1282; the default
  // link bone, ZzzCharacter.cpp:12069).
  bodyFx: [blur(33, 33, [1, 1, 1], 'blur02', { fromLocal: [0, 0, -60], toLocal: [0, 0, -150], short: true, gate: { action: [A.Attack1, A.Attack2] } })],
  model: { type: 92, scale: 1.5 },
});
