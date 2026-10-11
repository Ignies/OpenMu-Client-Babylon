import { PCT_HEAVY, type ClothMeshSpec } from '@/controllers/cloth';

/** `MONSTER_MAGIC_SKELETON_1` to `_7` (_enum.h:4470-4520), the switch of ZzzCharacter.cpp:8502-8508. */
const MAGIC_SKELETONS: ReadonlySet<number> = new Set([89, 95, 112, 118, 124, 130, 143]);

export const isMagicSkeleton = (monster: number | null): boolean => monster !== null && MAGIC_SKELETONS.has(monster);

/** Mesh 2 of its body (`bsh02.tga`) made cloth, pinned on bone 18, heavy, two spheres on that bone (:8514-8517). */
export const MAGIC_SKELETON_CLOTH: ClothMeshSpec = {
  mesh: 2,
  bone: 18,
  flags: PCT_HEAVY,
  spheres: [
    [0, 0, 0, 50, 18],
    [0, -20, 0, 30, 18],
  ],
};
