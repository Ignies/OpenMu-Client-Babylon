/**
 * What to print for a skill: the active language pack's name when it has one
 * (`Local/<lang>/skill_<lang>.bmd`), else the English name `skillsDatabase.ts`
 * carries. That file is generated from the server's own skill table and stays
 * the identity every lookup keys on, so this sits beside it rather than in it.
 */

import { skillDefinition } from './skillsDatabase';
import { localisedSkillName } from '../libs/mu/skillNameFile';

export function skillDisplayName(number: number): string | undefined {
  return localisedSkillName(number) ?? skillDefinition(number)?.name;
}
