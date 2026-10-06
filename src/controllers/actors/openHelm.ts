/** MODEL_HELM + these leave the class head on: Bronze, Pad, Vine to Spirit, 63, 65, 68, 70 (ZzzCharacter.cpp:12114-12122). */
const OPEN_HELMS: ReadonlySet<number> = new Set([0, 2, 10, 11, 12, 13, 63, 65, 68, 70]);

/**
 * Whether the class head (`PlayerObject.Helm`) is drawn: bare-headed it is the helm part itself, under an open
 * helm BODYPART_HEAD, under any other helm nothing (SetCharacterScale, ZzzCharacter.cpp:12114-12128).
 */
export function showsClassHead(helm: { readonly num: number } | null | undefined): boolean {
  return !helm || OPEN_HELMS.has(helm.num);
}
