import { CharacterClassNumber, PlayerClass } from './types';

export function isFemaleClass(n: CharacterClassNumber): boolean {
  switch (n) {
    case CharacterClassNumber.FairyElf:
    case CharacterClassNumber.MuseElf:
    case CharacterClassNumber.HighElf:
    case CharacterClassNumber.Summoner:
    case CharacterClassNumber.BloodySummoner:
    case CharacterClassNumber.DimensionMaster:
      return true;
    default:
      return false;
  }
}

export function MapPlayerNetClassToModelClass(
  n: CharacterClassNumber
): PlayerClass {
  switch (n) {
    case CharacterClassNumber.DarkWizard:
      return PlayerClass.DarkWizard;
    case CharacterClassNumber.SoulMaster:
      return PlayerClass.SoulMaster;
    case CharacterClassNumber.GrandMaster:
      return PlayerClass.GrandMaster;
    case CharacterClassNumber.DarkKnight:
      return PlayerClass.DarkKnight;
    case CharacterClassNumber.BladeKnight:
      return PlayerClass.BladeKnight;
    case CharacterClassNumber.BladeMaster:
      return PlayerClass.BladeMaster;
    case CharacterClassNumber.FairyElf:
      return PlayerClass.FairyElf;
    case CharacterClassNumber.MuseElf:
      return PlayerClass.MuseElf;
    case CharacterClassNumber.HighElf:
      return PlayerClass.HighElf;
    case CharacterClassNumber.MagicGladiator:
      return PlayerClass.MagicGladiator;
    case CharacterClassNumber.DuelMaster:
      return PlayerClass.DuelMaster;
    case CharacterClassNumber.DarkLord:
      return PlayerClass.DarkLord;
    case CharacterClassNumber.LordEmperor:
      return PlayerClass.LordEmperor;
    case CharacterClassNumber.Summoner:
      return PlayerClass.Summoner;
    case CharacterClassNumber.BloodySummoner:
      return PlayerClass.BloodySummoner;
    case CharacterClassNumber.DimensionMaster:
      return PlayerClass.DimensionMaster;
    case CharacterClassNumber.RageFighter:
      return PlayerClass.RageFighter;
    case CharacterClassNumber.FistMaster:
      return PlayerClass.FistMaster;
  }

  return PlayerClass.DarkWizard;
}
