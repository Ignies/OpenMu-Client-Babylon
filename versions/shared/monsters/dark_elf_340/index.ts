import { defineMonster } from '@/controllers/monsters';
import { MonsterActionType as A } from '../../objects/enum';
import { blur } from '../_shared/bodyFx';

/** `Dark_Elf_Check`: once Crywolf reaches START, the first Dark Elf to move (GMCrywolf1st.cpp:120-123, :844-866). */
const started = { cue: 'crywolfStart' } as const;
const RED = [1, 0.2, 0.2] as const;

export default defineMonster({
  Numb: 340,
  Name: 'Dark Elf',
  bodyFx: [
    // RenderObject's Attack1 / Attack2 trail along his weapon's LinkBone 33 (GMCrywolf1st.cpp:1254-1282; the default
    // link bone, ZzzCharacter.cpp:12069).
    blur(33, 33, [1, 1, 1], 'blur02', { fromLocal: [0, 0, -60], toLocal: [0, 0, -150], short: true, gate: { action: [A.Attack1, A.Attack2] } }),
    // At bone 27: the crater in his own light, two blue blurs and five red shock waves.
    { kind: 'ground', every: 1, ground: 'crater2', count: 1, bones: [27], colour: [1, 1, 1], gate: started },
    { kind: 'puff', every: 1, particles: ['blueBlur1', 'blueBlur1'], bones: [27], colour: RED, gate: started },
    { kind: 'ground', every: 1, ground: 'shockWave8', count: 5, bones: [27], colour: RED, gate: started },
  ],
  model: { type: 92, scale: 1.5 },
});
