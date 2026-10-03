import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 80,
  name: 'PLAYER_ATTACK_STRIKE',
  // The Dark Lord's strike (Force, Fire Burst), on foot and mounted (ZzzCharacter.cpp:948-949).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
