// Rewrites the PlayerAction enum in versions/shared/objects/enum.ts from the animation files.
// Run after adding or renaming an animation file: `bun versions/shared/animations/write_enum.ts`.
import { readFileSync, writeFileSync } from 'node:fs';
import { animations, playerActionEnumSource, replacePlayerActionEnum } from '@/controllers/anim';
import './all';

const path = `${import.meta.dir}/../objects/enum.ts`;
const before = readFileSync(path, 'utf8');
const after = replacePlayerActionEnum(before, playerActionEnumSource(animations.all()));
if (after !== before) writeFileSync(path, after);
console.log(after === before ? 'PlayerAction is up to date' : `PlayerAction rewritten: ${animations.all().length} clips`);
