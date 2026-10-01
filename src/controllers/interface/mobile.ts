/**
 * The one place the client decides it is being played with a thumb. Nothing
 * else may sniff the user agent or query `matchMedia` for this: the whole
 * mobile HUD, the touch-only input rules and every `.mu-mobile` style rule
 * hang off this answer, so there is exactly one of it.
 *
 * Coarse pointer *and* a touch point: a desktop with a touch monitor reports
 * coarse on its own, and a laptop trackpad reports touch points on its own.
 *
 * `?mobile=1` / `?mobile=0` overrides for the life of the page, which is how
 * the screenshot harness and a reviewer on a desktop see the mobile HUD. It
 * is deliberately not remembered: a stored override would leave a desktop
 * that once opened that URL on the touch HUD for good.
 *
 * Imported by `main.tsx` before the version loads, so it keeps no imports of
 * its own - the app graph behind `boot.tsx` reads `gameVersion` at module
 * scope and must not be pulled in early.
 */

const ROOT_CLASS = 'mu-mobile';

function readOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('mobile');
  if (param === '1') return true;
  if (param === '0') return false;
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
