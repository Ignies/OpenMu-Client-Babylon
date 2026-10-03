import { defineMonsterSwing } from '@/controllers/anim';

// SetCurrentAction_HellasMonster (GMHellas.cpp:960): the Schrikers and Illusions of Kundun, on any map.
export default defineMonsterSwing({
  name: 'schriker',
  monsters: [160, 180, 188, 196, 266, 274, 161, 181, 189, 197, 267, 275],
  otherwise: 'coin',
});
