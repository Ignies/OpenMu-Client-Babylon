# Change, add or override a window

## Redraw a window

Edit only `versions/shared/ui/windows/<window>/index.tsx` (and its `layout.ts` / `style.less`).
Use the interface controller's widgets (`@/controllers/interface/components/*`): item grid,
item tooltip, picked item, frames, buttons, text. A window draws; the state and the actions it
calls belong to its feature (`src/features/<feature>`).

## Restyle a shared widget everywhere

Edit `src/controllers/interface/components/<widget>/`. The item tooltip, for example, is the same
component in the inventory, vault, trade and shops.

## Add a window

1. `versions/shared/ui/windows/<snake_name>/index.tsx`: the component.
2. `window.ts` next to it:

   ```ts
   import { defineWindow } from '@/controllers/interface/windows';
   import { MyWindow } from '.';

   export default defineWindow({ id: 'my_window', slot: 'hud', order: 305, component: MyWindow });
   ```

   `order` is the stacking order (higher draws on top); see the other `window.ts` files.
3. It is found by glob (`versions/shared/ui/index.ts`). Always-on elements go in `ui/hud/` the same
   way; `slot: 'world'` draws under the HUD and stays up when the interface is hidden.
4. Open and close it with `MuWindows.setOpen('my_window', open)` and read `MuWindows.isOpen(...)`
   (`@/controllers/interface/windowManager`), not a new `Store` flag.

## One version draws it differently

Export it from the version's UI module (`versions/<id>/ui/index.ts`) in `windows`, with the same
`id`. It replaces the shared window for that version only.
