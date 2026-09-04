import './style.less';
import { MuSprite, useMuSprite } from '../muSprite';
import { useUiStageScale } from '../uiStage';
import { useVersionUi } from '../../../hooks/useVersionUi';

/**
 * `LoginScene::Render` in tour mode (Scenes/LoginScene.cpp:410-421): the glow
 * `MU-logo_g.jpg` then `MU-logo.tga`, both 256×128 drawn at 0.8 — so
 * 204.8×102.4 — centred on x 320, y 25 of the 640×480 stage, fading in by 0.02
 * a frame (`g_fMULogoAlpha`), about 0.8 s at 60 fps.
 *
 * Which art, and how big, is the version's answer (`pregame.logo`): the
 * wordmark art moved between versions and 0.97d has no separate glow sheet.
 *
 * Shared: the start menu and the login window both crown themselves with it.
 */

const LOGO_TOP = 25;

export const MuLogo = ({ top = LOGO_TOP }: { top?: number }) => {
  const stageScale = useUiStageScale();
  const ui = useVersionUi();
  // The glow is a JPEG (no alpha) the original draws additively. CSS blending
  // cannot reach the WebGL canvas through the overlay's stacking context, so
  // the JPEG masks itself by luminance: black surround → transparent.
  const logoGlow = useMuSprite(ui?.pregame.logo.glow);

  if (!ui) return null;

  const logo = ui.pregame.logo;

  return (
    <div
      className="mu-logo"
      style={{
        top: top * stageScale,
        width: logo.width * stageScale,
        height: logo.height * stageScale,
      }}
    >
      {logoGlow && (
        <div
          className={logo.mark ? 'mu-logo-glow' : 'mu-logo-glow is-only'}
          style={{
            backgroundImage: `url(${logoGlow.url})`,
            WebkitMaskImage: `url(${logoGlow.url})`,
            maskImage: `url(${logoGlow.url})`,
          }}
        />
      )}
      {logo.mark && <MuSprite file={logo.mark} className="mu-logo-mark" />}
    </div>
  );
};
