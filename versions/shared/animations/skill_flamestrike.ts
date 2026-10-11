import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 184,
  name: 'PLAYER_SKILL_FLAMESTRIKE',
  // The Magic Gladiator's two spell clips (ZzzCharacter.cpp:994-995): MagicSpeed1 is AttackSpeed1's stepped factor.
  speed: { base: 0.69, plus: 'magicSpeed' },
  skill: true,
});
