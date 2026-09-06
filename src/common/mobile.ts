import { useUiViewport } from '../ui/components/uiStage';
import { LocalStorage } from '../libs/localStorage';

/**
 * The one place the client decides it is being played with a thumb. Nothing
 * else may sniff the user agent or query `matchMedia` for this: the whole
 * mobile HUD, the touch-only input rules and every `.mu-mobile` style rule
 * hang off this answer, so there is exactly one of it.
 *
 * Coarse pointer *and* a touch point: a desktop with a touch monitor reports
 * coarse on its own, and a laptop trackpad reports touch points on its own.
 *
 * `?mobile=1` / `?mobile=0` overrides and is remembered, which is how the
 * screenshot harness and a reviewer on a desktop see the mobile HUD.
 */

const OVERRIDE_KEY = 'mu_mobile';
const ROOT_CLASS = 'mu-mobile';

function readOverride(): boolean | null {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('mobile');
    if (param === '1' || param === '0') {
      const value = param === '1';
      LocalStorage.save(OVERRIDE_KEY, String(value));
      return value;
    }
  }
  const stored = LocalStorage.load(OVERRIDE_KEY);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
}

function detect(): boolean {
  const override = readOverride();
  if (override !== null) return override;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarse && navigator.maxTouchPoints > 0;
}

const mobile = detect();

// The class the stylesheets key on, set before React's first paint so no
// desktop rule flashes on a phone.
if (mobile && typeof document !== 'undefined') {
  document.documentElement.classList.add(ROOT_CLASS);
}

export function isMobileDevice(): boolean {
  return mobile;
}

export function useIsMobile(): boolean {
  return mobile;
}

/** Rides the stage's own resize observer, so it re-renders on rotate. */
export function useIsPortrait(): boolean {
  const { width, height } = useUiViewport();
  return height >= width;
}
