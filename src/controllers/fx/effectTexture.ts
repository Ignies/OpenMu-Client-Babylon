import { Texture, type Scene } from '../render/babylon/exports';
import { downloadDataFile, hasDataFile, loadMuSprite } from '@/controllers/assets/mu';
import { reportLoadFailure } from '../assets';

const OZJ_HEADER_SIZE = 24;

const textureCache = new Map<string, Promise<Texture>>();

/** An effect texture from the original `Data/` tree (OZJ or OZT), one shared copy per file. */
export function loadEffectTexture(scene: Scene, file: string): Promise<Texture> {
  const cached = textureCache.get(file);
  if (cached) return cached;

  const pending = (async () => {
    // A file this version's tree does not have goes through the sprite
    // loader too: it hands back a 1x1 transparent pixel, so the effect draws
    // nothing instead of retrying a 404 every frame (`hasDataFile`).
    if (/\.ozt$/i.test(file) || !hasDataFile(file)) {
      // OZT (TGA with alpha): decoded through the sprite loader.
      const sprite = await loadMuSprite(file);
      return await new Promise<Texture>((resolve, reject) => {
        const texture = new Texture(
          sprite.url,
          scene,
          undefined,
          undefined,
          undefined,
          () => resolve(texture),
          (message, exception) => reject(exception ?? new Error(message ?? file))
        );
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
      });
    }

    const ozj = await downloadDataFile(file);

    const blob = new Blob([ozj.slice(OZJ_HEADER_SIZE)], {
      type: 'image/jpeg',
    });

    return await new Promise<Texture>((resolve, reject) => {
      const texture = new Texture(
        URL.createObjectURL(blob),
        scene,
        undefined,
        undefined,
        undefined,
        () => resolve(texture),
        (message, exception) => {
          console.error(`Could not load effect texture ${file}:`, message ?? exception);
          reject(exception ?? new Error(message ?? file));
        }
      );

      texture.wrapU = Texture.CLAMP_ADDRESSMODE;
      texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    });
  })();

  // Consumers that dispose a shared texture (particle systems do by default)
  // would otherwise leave the cache handing out a dead handle for the rest of
  // the session; evicting on dispose makes the next ask reload instead.
  void pending.then(texture => {
    texture.onDisposeObservable.addOnce(() => {
      if (textureCache.get(file) === pending) textureCache.delete(file);
    });
  }).catch(reportLoadFailure(file));

  textureCache.set(file, pending);

  return pending;
}
