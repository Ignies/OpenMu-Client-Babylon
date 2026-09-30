export function assertNotImplemented(x: never): never {
  throw new Error('not implemented:' + x);
}

export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
