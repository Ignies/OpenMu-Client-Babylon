import { memo, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { decodeTGA } from '../../src/libs/mu/tga';

/**
 * A standalone copy of the client's sprite loader, cut down to what a form
 * needs.
 *
 * The game's `libs/mu/sprites.ts` would do this already, but it reaches
 * `Data/` through `common/utils.ts`, which imports Babylon's `Texture` as a
 * value — so importing it here would pull the whole engine into a page that
 * draws six sprites and a text box. The decode itself is small enough to
 * restate; `decodeTGA` is shared, since that part is neither small nor
 * engine-bound.
 *
 * Keep the two header sizes in step with `libs/mu/sprites.ts` if the formats
 * are ever revisited.
 */

const OZJ_HEADER_SIZE = 24;
const OZT_HEADER_SIZE = 4;

/**
 * Where `Data/` lives. This page is served from its own origin
 * (`register.ignies.net`), so by default it borrows the client's already
 * published tree rather than shipping a second 88 MB copy of it. That is a
 * cross-origin fetch and needs CORS on the client host — see README.
 */
const DATA_URL = (import.meta.env.VITE_DATA_URL || './Data/').replace(
  /\/*$/,
  '/'
);

export type MuSprite = { url: string; width: number; height: number };

const cache = new Map<string, Promise<MuSprite>>();

function load(fileName: string): Promise<MuSprite> {
  const key = fileName.toLowerCase();
  let pending = cache.get(key);

  if (!pending) {
    pending = decode(fileName).catch(err => {
      // Drop the rejection so a transient failure can be retried on remount
      // rather than being cached forever.
      cache.delete(key);
      throw err;
    });
    cache.set(key, pending);
  }

  return pending;
}

async function decode(fileName: string): Promise<MuSprite> {
  const response = await fetch(`${DATA_URL}Interface/${fileName}`);

  if (!response.ok) {
    throw new Error(`${fileName}: HTTP ${response.status}`);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'ozj') return fromJPEG(fileName, buffer);
  if (ext === 'ozt') return fromTGA(fileName, buffer);

  throw new Error(`Unsupported sprite format for ${fileName}`);
}

async function fromJPEG(
  fileName: string,
  buffer: Uint8Array
): Promise<MuSprite> {
  const jpeg = buffer.slice(OZJ_HEADER_SIZE);

  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error(`${fileName} has no JPEG marker`);
  }

  const blob = new Blob([jpeg], { type: 'image/jpeg' });
  // The client parses the SOF header to avoid a second decode; six sprites do
  // not justify carrying that scanner, so this measures the simple way.
  const bitmap = await createImageBitmap(blob);

  try {
    return {
      url: URL.createObjectURL(blob),
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

async function fromTGA(fileName: string, buffer: Uint8Array): Promise<MuSprite> {
  const { width, height, pixels } = decodeTGA(
    fileName,
    buffer.slice(OZT_HEADER_SIZE)
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error(`No 2d context to decode ${fileName}`);

  ctx.putImageData(new ImageData(pixels, width, height), 0, 0);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png')
  );

  if (!blob) throw new Error(`Could not encode ${fileName} as PNG`);

  return { url: URL.createObjectURL(blob), width, height };
}

export function useMuSprite(fileName: string): MuSprite | null {
  const [sprite, setSprite] = useState<MuSprite | null>(null);

  useEffect(() => {
    let cancelled = false;

    load(fileName).then(
      loaded => {
        if (!cancelled) setSprite(loaded);
      },
      err => console.error(`Could not load sprite ${fileName}:`, err)
    );

    return () => {
      cancelled = true;
    };
  }, [fileName]);

  return sprite;
}

type MuSpriteFrameProps = {
  file: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children?: ReactNode;
};

/** A crop of a sprite sheet as a `div` background. */
export const MuSpriteFrame = memo(function MuSpriteFrame({
  file,
  x = 0,
  y = 0,
  width,
  height,
  className,
  style,
  onClick,
  children,
}: MuSpriteFrameProps) {
  const sprite = useMuSprite(file);

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        backgroundImage: sprite ? `url(${sprite.url})` : undefined,
        backgroundPosition: `-${x}px -${y}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      {children}
    </div>
  );
});
