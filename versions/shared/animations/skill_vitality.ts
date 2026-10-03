import { defineAnimation } from '@/controllers/anim';

export default defineAnimation({
  action: 67,
  name: 'PLAYER_SKILL_VITALITY',
  // Set after SetAttackSpeed's skill loop, over it (ZzzCharacter.cpp:1008).
  speed: 0.34,
  // PlayAnimation runs it at half after key 6 (ZzzCharacter.cpp:2497-2517).
  frameSpeeds: [{ after: 6, scale: 0.5 }],
  attack: true,
  skill: true,
});
