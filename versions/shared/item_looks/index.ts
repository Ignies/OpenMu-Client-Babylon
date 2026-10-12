import { registerItemLooks, type ItemLook } from '@/controllers/item_fx/itemLooks';

/** Every look file (`<item>.ts`), found by glob; `app/boot.tsx` imports this folder. Adding a look is adding a file. */
const looks = Object.values(
  import.meta.glob<ItemLook>(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true, import: 'default' })
);

registerItemLooks(looks);

export default looks;
