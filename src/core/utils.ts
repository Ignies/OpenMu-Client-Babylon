export function assertNotImplemented(x: never): never {
  throw new Error('not implemented:' + x);
}

/** The page is hidden (a background tab, a minimised window): the browser draws no frame. */
export function pageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden === true;
}

export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
