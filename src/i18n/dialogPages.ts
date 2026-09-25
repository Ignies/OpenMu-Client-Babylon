/**
 * Quest dialogue pages a shipped language pack gets wrong, by page number.
 *
 * `Data/Local/<pack>/Dialog_<lang>.bmd` is Webzen's own table, and a page here
 * replaces the text of one record of it after decoding, the way `itemNames.ts`
 * replaces single item names. The page keeps its answers and their links.
 * Read by `libs/mu/questFiles.ts`.
 */

export type DialogPageFixes = Readonly<Record<number, string>>;

// Page 67 opens "Three Treasures of Mu" for the Dark Wizard. Both packs copied
// the Fairy Elf's page 64 onto it, which sends a Wizard for the Tear of Elf;
// the English page stops at the three treasures and page 82 names the Soul of
// Wizard.

export const SPANISH_DIALOG_PAGES: DialogPageFixes = {
  67: "Has leído el 'Rollo del Emperador', ¿verdad? Entonces debes estar al tanto de los 3 tesoros registrados en él.",
};

export const PORTUGUESE_DIALOG_PAGES: DialogPageFixes = {
  67: "Você leu o 'Pergaminho do Imperador', não leu? Então você sabe sobre os 3 tesouros registrados nele.",
};
