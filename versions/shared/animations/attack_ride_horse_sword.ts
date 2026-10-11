import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 84,
  name: 'PLAYER_ATTACK_RIDE_HORSE_SWORD',
  // SetAttackSpeed (ZzzCharacter.cpp:950).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
