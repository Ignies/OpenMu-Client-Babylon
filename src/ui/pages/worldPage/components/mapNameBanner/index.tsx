import './style.less';
import { useEffect, useRef, useState } from 'react';
import { i18n } from '../../../../../i18n';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { useMuSprite } from '../../../../components/muSprite';
import { useUiStageScale } from '../../../../components/uiStage';

/**
 * `CUIMapName` (UIMapName.cpp): entering a map fades in that map's name
 * picture (`Local/<lang>/ImgsMapName/*.OZT`, the 166x90 top-left corner of a
 * 256x128 texture), holds it 5 s and fades it out. Centred horizontally,
 * top at line 220 of the 480-line virtual screen. A world with no entry in
 * `InitImgPathMap` (the GM area, Crywolf 2nd) shows nothing.
 */

const SHOW_TIME = 5000;
// UIMN_ALPHA_VARIATION is per rendered frame; the original runs at 60 fps.
const ALPHA_PER_SECOND = 0.015 * 60;
const START_ALPHA = 0.2;

const IMG_WIDTH = 166;
const IMG_HEIGHT = 90;
const IMG_TOP = 220 / 480;

const FADE_IN_MS = ((1 - START_ALPHA) / ALPHA_PER_SECOND) * 1000;
const FADE_OUT_MS = (1 / ALPHA_PER_SECOND) * 1000;

// `InitImgPathMap`, file names as shipped in Data/Local/<lang>/ImgsMapName.
const MAP_IMAGES: Record<number, string> = {
  0: 'lorencia.OZT',
  1: 'dungeun.OZT',
  2: 'devias.OZT',
  3: 'noria.OZT',
  4: 'losttower.OZT',
  6: 'stadium.OZT',
  7: 'atlans.OZT',
  8: 'tarcan.OZT',
  9: 'devilsquare.OZT',
  10: 'Icarus.OZT',
  30: 'loren.OZT',
  31: 'ordeal.OZT',
  // Devil Square 5-7: `LoadWorld` folds map 32 into WD_9DEVILSQUARE.
  32: 'devilsquare.OZT',
  33: 'aida.OZT',
  34: 'crywolffortress.OZT',
  36: 'lostkalima.OZT',
  41: 'BalgasBarrack.OZT',
  42: 'BalgasRefuge.OZT',
  51: 'Elbeland.OZT',
  52: 'bloodcastle.OZT',
  53: 'chaoscastle.OZT',
  56: 'SwampOfCalmness.OZT',
  57: 'mapname_raklion.OZT',
  58: 'mapname_raklionboss.OZT',
  62: 'santatown.OZT',
  63: 'pkfield.OZT',
  64: 'duelarena.OZT',
  79: 'MapName_MarketRolen.OZT',
};

function bannerImage(map: number): string | null {
  if (map >= 11 && map <= 17) return 'bloodcastle.OZT';
  if (map >= 18 && map <= 23) return 'chaoscastle.OZT';
  if (map >= 24 && map <= 29) return 'Kalima.OZT';
  if (map >= 37 && map <= 39) return 'kantru.OZT';
  if (map >= 45 && map <= 50) return 'IllusionTemple.OZT';
  if (map >= 65 && map <= 68) return 'Doppelganger.OZT';
  if (map >= 69 && map <= 72) return 'EmpireGuardian.OZT';
  if (map === 80 || map === 81) return 'mapname_karutan.ozt';
  return MAP_IMAGES[map] ?? null;
}

type Shown = { map: number; at: number };

export const MapNameBanner = () => {
  const [shown, setShown] = useState<Shown | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const scale = useUiStageScale();

  useEventBus('warpCompleted', ({ map }) => {
    // `ShowMapName` restarts the fade on every entry, same map included.
    setShown({ map, at: Date.now() });
  });

  const file = shown ? bannerImage(shown.map) : null;
  const folder = i18n.dataPack?.folder ?? 'Eng';
  const sprite = useMuSprite(
    file ? `Data/Local/${folder}/ImgsMapName/${file}` : undefined
  );

  // The original steps the alpha only once the bitmap is in; the clock
  // starts when the sprite is decoded, not at warpCompleted.
  useEffect(() => {
    if (!shown || !sprite) return;

    let start = -1;
    let frame = 0;

    const tick = (now: number) => {
      // The original's load blocks the frame loop; here the loading screen
      // still covers the world, so the clock waits for it.
      if (start < 0) {
        if (Store.sceneLoading) {
          frame = requestAnimationFrame(tick);
          return;
        }
        start = now;
      }

      const t = now - start;
      let alpha: number;

      if (t < FADE_IN_MS) {
        alpha = START_ALPHA + (ALPHA_PER_SECOND * t) / 1000;
      } else if (t < FADE_IN_MS + SHOW_TIME) {
        alpha = 1;
      } else if (t < FADE_IN_MS + SHOW_TIME + FADE_OUT_MS) {
        alpha = 1 - (ALPHA_PER_SECOND * (t - FADE_IN_MS - SHOW_TIME)) / 1000;
      } else {
        setShown(current => (current === shown ? null : current));
        return;
      }

      if (ref.current) ref.current.style.opacity = alpha.toFixed(3);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shown, sprite]);

  if (!shown || !file || !sprite) return null;

  return (
    <div
      ref={ref}
      className="map-name-banner"
      style={{
        width: IMG_WIDTH * scale,
        height: IMG_HEIGHT * scale,
        marginLeft: (-IMG_WIDTH * scale) / 2,
        top: `${IMG_TOP * 100}%`,
        // The original draws the 166x90 top-left corner of a 256x128 texture;
        // this Data folder ships the images already cropped to 166x90. Sizing
        // by the decoded picture keeps both layouts right.
        backgroundImage: `url(${sprite.url})`,
        backgroundSize: `${sprite.width * scale}px ${sprite.height * scale}px`,
        opacity: START_ALPHA,
      }}
    />
  );
};
