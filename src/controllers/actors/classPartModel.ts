import { BaseClass, getBaseClass, type CharacterClassNumber } from '../../core/types';

const GROUP_HELM = 7;
const GROUP_BOOTS = 11;
/** `{ 5, 6, 8, 9 }`: Leather, Scale, Brass and Plate (MonkSystem.cpp:191). */
const MONK_SETS = [5, 6, 8, 9];
/** MODEL_HELM_MONK..MODEL_BOOTS_MONK by group 7-11: gloves and boots both take BootMonk (MonkSystem.cpp:199). */
const MONK_PARTS = ['HelmMonk', 'ArmorMonk', 'PantMonk', 'BootMonk', 'BootMonk'];
/** MODEL_HELM2..MODEL_BOOTS2 (ZzzOpenData.cpp:259-266). */
const ELF_C_PARTS = ['HelmElfC', 'ArmorElfC', 'PantElfC', 'GloveElfC', 'BootElfC'];
/** The helms a Dark Lord wears as `MODEL_MASK_HELM + index` (ZzzCharacter.cpp:9610-9616, ZzzOpenData.cpp:166-170). */
const MASK_HELMS = [0, 5, 6, 8, 9];

const two = (n: number) => String(n).padStart(2, '0');

/**
 * The model a class wears for an armour piece in place of the item's own, or null
 * (`RenderCharacter`, ZzzCharacter.cpp:9579-9617): the Summoner's Vine and Silk pieces
 * (MODEL_HELM2...), the Rage Fighter's four common sets (`ModifyTypeCommonItemMonk`,
 * MonkSystem.cpp:187-206) and the Dark Lord's five mask helms. A `Player/` file name.
 */
export function classPartModel(
  part: { readonly group: number; readonly num: number },
  charClass: CharacterClassNumber
): string | null {
  const { group, num } = part;
  if (group < GROUP_HELM || group > GROUP_BOOTS) return null;
  const slot = group - GROUP_HELM;
  switch (getBaseClass(charClass)) {
    case BaseClass.Summoner:
      return num === 10 || num === 11 ? `${ELF_C_PARTS[slot]}${two(num - 9)}.glb` : null;
    case BaseClass.RageFighter: {
      const set = MONK_SETS.indexOf(num);
      return set < 0 ? null : `${MONK_PARTS[slot]}${two(set + 1)}.glb`;
    }
    case BaseClass.DarkLord:
      return group === GROUP_HELM && MASK_HELMS.includes(num) ? `MaskHelmMale${two(num + 1)}.glb` : null;
    default:
      return null;
  }
}
