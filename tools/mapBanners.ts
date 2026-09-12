/**
 * Writes `Data/Local/<pack>/ImgsMapName/*.OZT` for the generated language
 * packs: the map name plate that fades in when you enter a map.
 *
 * Webzen drew the name into the bitmap rather than drawing it at runtime, and
 * shipped one set per language, so translating a plate means redrawing it.
 * Their own Spanish set says how: the descriptive names are translated
 * (Blood Castle -> Castillo Sangriento) and the proper nouns are kept
 * (Lorencia, Devias, Atlans), in a different face from the English set. The
 * wording lives in `packs/banners.json`; this only draws it.
 *
 * The flourish under the name is decoration, not language, so it is kept: one
 * clean band lifted from the English Lorencia plate and laid under every name
 * (see `ornament` for why one band rather than each plate's own).
 *
 * ## Running it
 *
 * ```
 * node tools/mapBanners.ts            # every language
 * node tools/mapBanners.ts --only rus
 * ```
 *
 * **Windows only, and node rather than bun** (the pack tool's constraint too).
 * The lettering is rasterised by GDI+ through `mapBanners.ps1`, which is what
 * gets the Thai mark positioning and the CJK faces right without shipping a
 * shaping engine. The output is committed, so this is a tool you run when the
 * wording changes, not part of the build.
 *
 * An OZT is a 4-byte header in front of an uncompressed 32-bit bottom-up TGA:
 * `sprites.ts` reads them with `OZT_HEADER_SIZE` and the same assumption.
 */

import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(HERE, '..', 'Data', 'Local');
const ENGLISH = resolve(DATA, 'Eng', 'ImgsMapName');

const OZT_HEADER = 4;
const TGA_HEADER = 18;
const TGA_FOOTER = 26;

/** Rows 0..TEXT_H-1 hold the name; the ornament owns the rest. */
const TEXT_H = 45;

type Image = { w: number; h: number; rgba: Uint8Array };

/**
 * Which face draws which language. `size` is the size a name is drawn at when
 * it fits, and a ceiling when it does not: the rasteriser steps down from here
 * until the word is inside the plate. Set it so a typical name lands near the
 * 35-pixel cap height of the English plates and a long one shrinks - the same
 * thing the original does, where short names are narrow and long names fill
 * the width.
 */
type Face = { font: string; style: number; size: number };

const FACES: Record<string, Face> = {
  // A slanted serif for the alphabets the original used one for. Palatino
  // covers Cyrillic in the same face, so Russian and Bulgarian sit beside
  // German without a visible change of voice.
  ger: { font: 'Palatino Linotype', style: 3, size: 35 },
  fre: { font: 'Palatino Linotype', style: 3, size: 35 },
  ita: { font: 'Palatino Linotype', style: 3, size: 35 },
  rom: { font: 'Palatino Linotype', style: 3, size: 35 },
  rus: { font: 'Palatino Linotype', style: 3, size: 35 },
  bul: { font: 'Palatino Linotype', style: 3, size: 35 },
  // No italic serif reaches these scripts, so each takes the most book-like
  // face Windows ships for it and stays upright. Slanting a CJK face
  // synthetically only smears it.
  chi: { font: 'SimSun', style: 1, size: 34 },
  jpn: { font: 'Yu Gothic', style: 1, size: 32 },
  kor: { font: 'Malgun Gothic', style: 1, size: 32 },
  tha: { font: 'Leelawadee UI', style: 1, size: 30 },
};

/** The folder each suffix writes into, spelled as on disk. */
const FOLDERS: Record<string, string> = {
  ger: 'Ger', fre: 'Fre', ita: 'Ita', rom: 'Rom', rus: 'Rus',
  bul: 'Bul', chi: 'Chi', jpn: 'Jpn', kor: 'Kor', tha: 'Tha',
};

export function readOzt(path: string): Image {
  const t = new Uint8Array(readFileSync(path)).subarray(OZT_HEADER);
  const head = new DataView(t.buffer, t.byteOffset, TGA_HEADER);
  const w = head.getUint16(12, true);
  const h = head.getUint16(14, true);
  const src = t.subarray(TGA_HEADER, TGA_HEADER + w * h * 4);
  const rgba = new Uint8Array(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((h - 1 - y) * w + x) * 4;     // TGA rows run bottom-up
      const d = (y * w + x) * 4;
      rgba[d] = src[s + 2];
      rgba[d + 1] = src[s + 1];
      rgba[d + 2] = src[s];
      rgba[d + 3] = src[s + 3];
    }
  }

  return { w, h, rgba };
}

export function writeOzt(path: string, { w, h, rgba }: Image): void {
  const out = new Uint8Array(OZT_HEADER + TGA_HEADER + w * h * 4 + TGA_FOOTER);
  const t = out.subarray(OZT_HEADER);
  const head = new DataView(t.buffer, t.byteOffset, TGA_HEADER);

  t[2] = 2;                                     // uncompressed true-colour
  head.setUint16(12, w, true);
  head.setUint16(14, h, true);
  t[16] = 32;
  t[17] = 8;                                    // 8 alpha bits, origin bottom-left

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = TGA_HEADER + ((h - 1 - y) * w + x) * 4;
      t[d] = rgba[s + 2];
      t[d + 1] = rgba[s + 1];
      t[d + 2] = rgba[s];
      t[d + 3] = rgba[s + 3];
    }
  }

  // The v2 footer, which is what marks the alpha as meant rather than padding.
  const footer = 'TRUEVISION-XFILE.';
  const at = TGA_HEADER + w * h * 4 + 8;
  for (let i = 0; i < footer.length; i++) t[at + i] = footer.charCodeAt(i);

  writeFileSync(path, out);
}

/**
 * The flourish under the name, taken once from the Lorencia plate.
 *
 * Every plate carries the same drawing, but not the same pixels: a descender
 * from a long name reaches down into those rows, and the whole block sits a
 * little higher or lower from plate to plate. Cutting each one's own band
 * would therefore copy its old lettering's tail under the new name. One clean
 * band, from a plate whose text stops well clear of it, avoids that and makes
 * the generated set more consistent than the original.
 */
function ornament(): Uint8Array {
  const src = readOzt(resolve(ENGLISH, 'lorencia.OZT'));
  return src.rgba.subarray(TEXT_H * src.w * 4);
}

/** A plate of `height` rows: the rasterised name, and the flourish under it. */
function plate(width: number, height: number, raw: Uint8Array): Image {
  const rgba = new Uint8Array(width * height * 4);

  const rows = Math.min(TEXT_H, height);
  for (let i = 0; i < rows * width; i++) {
    rgba[i * 4] = raw[i * 4 + 2];               // the rasteriser hands back BGRA
    rgba[i * 4 + 1] = raw[i * 4 + 1];
    rgba[i * 4 + 2] = raw[i * 4];
    rgba[i * 4 + 3] = raw[i * 4 + 3];
  }

  // The short strip (`MapNameAddStrife`, the battle-zone label) is lettering
  // only - there is no room for a flourish and the original draws none.
  if (height > TEXT_H) rgba.set(ornament(), TEXT_H * width * 4);

  return { w: width, h: height, rgba };
}

type Job = {
  text: string;
  font: string;
  style: number;
  size: number;
  stroke: number;
  palette: string;
  width: number;
  height: number;
  out: string;
};

/**
 * The battle-zone label is the one plate the original draws differently: a
 * 166x28 strip with no flourish, lettered in rose rather than silver.
 */
const ROSE = 'MapNameAddStrife.OZT';

export function buildBanners(only: string | null): void {
  const banners = JSON.parse(
    readFileSync(resolve(HERE, 'packs', 'banners.json'), 'utf8')
  ) as Record<string, Record<string, string>>;

  const files = Object.keys(banners).filter(k => k !== '_');
  const langs = Object.keys(FACES).filter(l => !only || l === only);
  if (only && !langs.length) throw new Error(`No face for '${only}'`);

  // One scratch folder for the whole run: the rasteriser hands back raw BGRA
  // rather than an image, so there is no decoder on this side.
  const scratch = resolve(tmpdir(), `mu-banners-${process.pid}`);
  mkdirSync(scratch, { recursive: true });

  try {
    for (const lang of langs) {
      const folder = FOLDERS[lang];
      const outDir = resolve(DATA, folder, 'ImgsMapName');
      mkdirSync(outDir, { recursive: true });

      const face = FACES[lang];
      const jobs: Job[] = [];
      const plates: { file: string; raw: string; w: number; h: number }[] = [];

      for (const file of files) {
        const text = banners[file][lang];
        // No entry means the English plate is right as it stands; the reader
        // falls back to it per file.
        if (!text) continue;

        const raw = resolve(scratch, `${lang}-${file}.raw`);
        const { w, h } = readOzt(resolve(ENGLISH, file));
        jobs.push({
          text,
          ...face,
          stroke: 2.4,
          palette: file === ROSE ? 'rose' : 'silver',
          width: w,
          height: Math.min(TEXT_H, h),
          out: raw,
        });
        plates.push({ file, raw, w, h });
      }

      const jobsPath = resolve(scratch, `${lang}.json`);
      writeFileSync(jobsPath, JSON.stringify(jobs), 'utf8');
      execFileSync(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
          resolve(HERE, 'mapBanners.ps1'), jobsPath],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );

      for (const { file, raw, w, h } of plates) {
        if (!existsSync(raw)) throw new Error(`${lang}: ${file} did not rasterise`);
        writeOzt(resolve(outDir, file), plate(w, h, new Uint8Array(readFileSync(raw))));
      }

      console.log(`${folder}  ${plates.length} plates -> Local/${folder}/ImgsMapName`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const at = process.argv.indexOf('--only');
  buildBanners(at > 0 ? process.argv[at + 1] : null);
}
