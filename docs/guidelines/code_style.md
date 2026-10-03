# Code style

- **Short.** If the same behaviour fits in fewer lines, use fewer lines. Delete dead code.
- **Small comments.** One or two lines in the file: what is not obvious, plus the original source
  line. History, reasoning and alternatives go in the folder's `readme.md`.
- **Names say what, not how.** `castTarget`, `skillHome`, `registerWindows`.
- **One thing per file.** A skill, a window, an effect layer, a module net.
- **Imports.** Inside a folder use `./x`; across roots or deep paths use `@/...` (src) and
  `@versions/...` (versions).
- **File names.** Code: the existing camelCase. Content and doc folders: lowercase `snake_case`
  (`dark_wizard/nova`, `windows/inventory`, `texture_packs.md`).
- **Formatting.** `.prettierrc`: single quotes, 2 spaces, trailing commas where ES5 allows.
- **No em-dashes** anywhere. Use `-`.
- **No AI attribution** in code, comments, commits or pull requests.
