/// <reference types="vite/client" />
// Client only: every monster folder's model class (`<name>/model.ts`, and the shared lines in
// `_<line>/model.ts`) registers itself with the actors controller when this loads. Servers never
// import it, so they never load model code.
import.meta.glob(['./*/model.ts', '!./**/*.test.ts'], { eager: true });
