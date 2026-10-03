import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 183,
  name: 'PLAYER_SKILL_GIGANTICSTORM',
  // The Magic Gladiator's two spell clips (ZzzCharacter.cpp:994-995): MagicSpeed1 is AttackSpeed1's stepped factor.
  speed: { base: 0.55, plus: 'magicSpeedStepped' },
  skill: true,
});
