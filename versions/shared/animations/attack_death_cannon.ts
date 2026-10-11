import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 138,
  name: 'PLAYER_ATTACK_DEATH_CANNON',
  // SetAttackSpeed's own line for the Magic Gladiator clips (ZzzCharacter.cpp:929, :970, :972).
  speed: { base: 0.2, plus: 'attackSpeed' },
  skill: true,
});
