import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 156,
  name: 'PLAYER_SKILL_SLEEP',
  // The Summoner curse clip and its mounts (ZzzCharacter.cpp:974-977).
  speed: { base: 0.3, plus: 'magicSpeed' },
  skill: true,
});
