import { defineMonster } from '@/controllers/monsters';

export default defineMonster({
  Numb: 364,
  Name: 'Maya',
  // Her body only stands for the two hands: MODEL_MAYA with HiddenMesh = -2 draws nothing
  // (GM_Kanturu_3rd.cpp:773-781), so no Bull Fighter and no snort.
  hidden: true,
});
