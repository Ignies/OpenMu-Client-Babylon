/**
 * The Dark Lord's master-level numbers (OpenMU 508-523) and the base skill each one
 * strengthens. The original lists a strengthened skill in its base skill's `case`, so it
 * shares the clip, the effect, the sound and the light (ZzzCharacter.cpp:4366-4369,
 * WSclient.cpp:5242-5272). Store-free, so the clip, sound and light tables can resolve
 * through it as the visuals do. 510 / 513 are passives and 521 has its own row.
 */
export const DARK_LORD_MASTER_ALIASES: Readonly<Record<number, number>> = {
  508: 61, 509: 66, 511: 64, 512: 62, 514: 61, 515: 64, 516: 62, 517: 64, 518: 78, 519: 65, 520: 78, 522: 64, 523: 238,
};

/** The base skill a master-level number borrows its clip, sound and light from, else the skill itself. */
export function masterBase(skill: number): number {
  return DARK_LORD_MASTER_ALIASES[skill] ?? skill;
}
