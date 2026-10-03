/**
 * Master-level numbers and the base skill each one strengthens, for the ones the original
 * lists in its base skill's `case` (the Dark Lord's 508-523, ZzzCharacter.cpp:4366-4369,
 * WSclient.cpp:5242-5272) or casts, draws, sounds and lights as the base (the Magic
 * Gladiator's SKILL_REPLACEMENTS, _enum.h:637-707). Filled by `registerSkills` from each
 * base skill's `masterAliases`; store-free, so the clip, sound and light tables can
 * resolve through it as the visuals do.
 */
export const MASTER_BASES: Record<number, number> = {};

/** The base skill a master-level number borrows its clip, sound and light from, else the skill itself. */
export function masterBase(skill: number): number {
  return MASTER_BASES[skill] ?? skill;
}
