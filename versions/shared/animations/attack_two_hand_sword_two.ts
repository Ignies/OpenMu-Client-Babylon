import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 145,
  name: 'PLAYER_ATTACK_TWO_HAND_SWORD_TWO',
  // SetAttackSpeed's own line for the Magic Gladiator clips (ZzzCharacter.cpp:929, :970, :972).
  speed: { base: 0.25, plus: 'attackSpeed' },
  skill: true,
});
