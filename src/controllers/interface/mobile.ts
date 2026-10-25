/**
 * The one place the client decides it is played by touch (`?mobile=1|0` overrides).
 * Imported by `app/main.tsx` before the version loads, so it has no imports. See readme.md.
 */

const ROOT_CLASS = 'mu-mobile';

function readOverride(): boolean | null {
  if (typeof window === 'undefined') return null;
  // `location` can be missing where tests stub `window` (camera/view.test.ts).
  const param = new URLSearchParams(window.location?.search ?? '').get('mobile');
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
