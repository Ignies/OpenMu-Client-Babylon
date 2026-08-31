import './style.less';
import { MuSprite, useMuSprite } from '../muSprite';
import { useUiStageScale } from '../uiStage';

/**
 * `LoginScene::Render` in tour mode (Scenes/LoginScene.cpp:410-421): the glow
 * `MU-logo_g.jpg` then `MU-logo.tga`, both 256×128 drawn at 0.8 — so
 * 204.8×102.4 — centred on x 320, y 25 of the 640×480 stage, fading in by 0.02
 * a frame (`g_fMULogoAlpha`), about 0.8 s at 60 fps. The art is 512×256 and
 * lives in `Data/Logo`, not `Interface`.
 *
 * Shared: the start menu and the login window both crown themselves with it.
 */

const LOGO = { width: 256 * 0.8, height: 128 * 0.8, top: 25 };
const LOGO_SPRITE = 'Data/Logo/MU-logo.OZT';
const LOGO_GLOW_SPRITE = 'Data/Logo/MU-logo_g.OZJ';

export const MU_LOGO_HEIGHT = LOGO.height;

export const MuLogo = ({ top = LOGO.top }: { top?: number }) => {
  const stageScale = useUiStageScale();
  // The glow is a JPEG (no alpha) the original draws additively. CSS blending
  // cannot reach the WebGL canvas through the overlay's stacking context, so
  // the JPEG masks itself by luminance: black surround → transparent.
  const logoGlow = useMuSprite(LOGO_GLOW_SPRITE);

  return (
    <div
      className="mu-logo"
      style={{
        top: top * stageScale,
        width: LOGO.width * stageScale,
        height: LOGO.height * stageScale,
      }}
    >
      {logoGlow && (
        <div
          className="mu-logo-glow"
          style={{
            backgroundImage: `url(${logoGlow.url})`,
            WebkitMaskImage: `url(${logoGlow.url})`,
            maskImage: `url(${logoGlow.url})`,
          }}
        />
      )}
      <MuSprite file={LOGO_SPRITE} className="mu-logo-mark" />
    </div>
  );
};
