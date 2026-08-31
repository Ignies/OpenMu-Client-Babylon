import { CharacterClassNumber } from './types';
import { BaseClass, getBaseClass } from './characterStats';

/**
 * Object.Scale per base class in the world (ZzzCharacter.cpp:11925-11933,
 * Skin == 0 branch) and on the character-select scene (:11913-11917).
 */
export function classWorldScale(cls: CharacterClassNumber): number {
  switch (getBaseClass(cls)) {
    case BaseClass.Wizard:
      return 0.9;
    case BaseClass.Knight:
      return 0.9;
    case BaseClass.Elf:
      return 0.88;
    case BaseClass.MagicGladiator:
      return 0.95;
    case BaseClass.DarkLord:
      return 0.92;
    case BaseClass.Summoner:
      return 0.9;
    case BaseClass.RageFighter:
      return 1.03;
  }
}

export function classSelectSceneScale(cls: CharacterClassNumber): number {
  return getBaseClass(cls) === BaseClass.RageFighter ? 1.35 : 1.2;
}
