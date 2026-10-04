# components

Shared UI pieces that read a gameplay module's state, so they cannot live in the interface
controller (`src/controllers/interface/components/`, which only draws what it is handed: a
controller never imports a module). Windows, HUD elements and pages import them by folder.

## Public API
- `skill_icon`: `SkillIcon({ number, disabled })`, a skill's 20 x 28 cell (`RenderSkillIcon`); a
  master skill's cell comes from the master tree tables (`modules/skills/masterTree.ts`), loaded on
  first need.
- `skill_tooltip`: `SkillTooltip` (`RenderSkillInfo`) and `MuTipList` / `TipLine`, the tip list the
  experience bar tooltip shares. Reads the skills module (cooldowns, requirements, block reasons).
- `emoji_text`: `EmojiText`, a chat line with its emoji codes drawn as pictures and its item links
  as `ChatItemLink`s (the label from `modules/chat/chatItemLinks.ts`). Reads `modules/chat`.
- `reconnect_overlay`: `ReconnectOverlay`, the plate over the screen while `SessionResume` walks the
  login flow again (`modules/session`); `App.tsx` mounts it.

## How it works
- Same shape as an interface widget: `index.tsx`, optional `style.less` and `i18n/<code>.ts`.
- Why here: each reads a module (`modules/skills`, `modules/chat`, `modules/session`). They moved out
  of `controllers/interface/components/` to drop those controller -> module imports.

## Depends on / used by
- uses: `controllers/interface` widgets (`mu_sprite`, `chat_item_link`), `controllers/assets`
  (`skillDisplayName`), `controllers/settings`, `controllers/sound` (`uiClick`), `modules/skills`,
  `modules/chat`, `modules/session`, `@versions/shared/skills/skillsDatabase`, `src/i18n`.
- used by: HUD `bottom_bar/` (`index.tsx`, `expTooltip.tsx`), `mobile_controls/skillPad.tsx`, `chat/`,
  `name_tags/`; windows `skills/`, `mu_helper/`, `chat_room/`; `src/app/App.tsx` (`reconnect_overlay`).

## Change it
- a new shared piece that reads a module: add `<name>/index.tsx` here. One that only draws what it
  is given belongs in `src/controllers/interface/components/`.

## Tests
- none of their own; the skill goldens (`versions/shared/skills/*.golden.test.ts`) pin the data
  they read.
