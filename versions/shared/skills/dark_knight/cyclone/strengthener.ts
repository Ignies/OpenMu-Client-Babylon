import { defineSkill } from '@/controllers/skills/define';

export default defineSkill({
  id: 326,
  name: "Cyclone Strengthener",
  // Blade Master ranks play their base skill's sound: they share its case (WSclient.cpp:4368-4417,
  // ZzzCharacter.cpp:4190-4212, :4410-4419).
  sound: 'Sound/sKnightSkill4', // Cyclone Str
});
