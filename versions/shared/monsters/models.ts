/// <reference types="vite/client" />
// Client only: every monster and NPC folder's model class (`<name>/model.ts`, and the shared lines
// in `_<line>/model.ts`) registers itself with the actors controller when this loads. Servers never
// import it, so they never load model code.
import.meta.glob(['./*/model.ts', '!./**/*.test.ts'], { eager: true });
// The archangels (232, 233) wait in versions/shared/npcs for an fx door (see ../npcs/readme.md).
import '../npcs/archangel';
