export const BMD_EXT = '.bmd';
export const MP3_EXT = '.mp3';
export const WAV_EXT = '.wav';
export const OGG_EXT = '.ogg';
export const OZJ_EXT = '.ozj';
export const JPG_EXT = '.jpg';
export const OZT_EXT = '.ozt';
export const TGA_EXT = '.tga';

export const PROJECT_ROOT = __dirname + `/../`;
export const DATA_FOLDER = PROJECT_ROOT + `Data/`;

/**
 * Where the converted GLBs land. Overridable so a pipeline change can be
 * trialled into a scratch folder and diffed before it overwrites ~200 MB of
 * working assets in place — there is no VCS here to undo that.
 *
 *   GLB_OUTPUT=/tmp/glb-test bun run tools/bmdToGlb.ts Object1
 */
export const OUTPUT_FOLDER = process.env.GLB_OUTPUT
  ? process.env.GLB_OUTPUT.replace(/[/]+$/, '') + '/'
  : PROJECT_ROOT + `public/game-assets/`;
