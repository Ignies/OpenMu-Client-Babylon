import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 136,
  name: 'PLAYER_ATTACK_ONE_FLASH',
  // SetAttackSpeed's own line for the Magic Gladiator clips (ZzzCharacter.cpp:929, :970, :972).
  speed: { base: 0.4, plus: 'attackSpeed' },
  skill: true,
});
