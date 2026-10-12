import { defineItemLook } from '@/controllers/item_fx/itemLooks';
import { archangelGlint } from './divine_sword_of_archangel';

// MODEL_DIVINE_SCEPTER_OF_ARCHANGEL carried (ZzzCharacter.cpp:7647-7660): one glint at bone 0.
export default defineItemLook({ items: [[2, 13]], held: archangelGlint(0) });
