/**
 * OpenMU's default experience table (GameContext.cs `DefaultExperienceFormula`):
 *   level == 0      → 0
 *   level <  256    → 10 * (level + 8) * (level - 1)^2
 *   level >= 256    → the above + 1000 * (level - 247) * (level - 256)^2
 *
 * `experienceForLevel(n)` is the total experience needed to *reach* level n.
 * The server only sends `ExperienceForNextLevel` with `CharacterInformation`;
 * after a `CharacterLevelUpdate` the client has to derive the new bracket itself.
 */
export function experienceForLevel(level: number): number {
  if (level <= 0) return 0;
  const base = 10 * (level + 8) * (level - 1) * (level - 1);
  if (level < 256) return base;
  return base + 1000 * (level - 247) * (level - 256) * (level - 256);
}
