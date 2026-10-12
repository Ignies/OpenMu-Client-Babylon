import { afterEach, describe, expect, it } from 'vitest';
import { HAND_OVER, handOverPort, sandboxFrame, sandboxPage } from './sandbox';

const open: MessagePort[] = [];
afterEach(() => open.splice(0).forEach(p => p.close()));

describe('sandboxFrame', () => {
  it('lets the frame run scripts and nothing else', () => {
    expect(sandboxFrame({ srcdoc: '<p>module</p>' })).toEqual({
      sandbox: 'allow-scripts',
      srcdoc: '<p>module</p>',
      referrerpolicy: 'no-referrer',
    });
    expect(sandboxFrame({ blob: 'blob:https://play.ignies.net/5d2c' })).toEqual({
      sandbox: 'allow-scripts',
      src: 'blob:https://play.ignies.net/5d2c',
      referrerpolicy: 'no-referrer',
    });
  });

  it('never grants the same origin, top navigation or popups', () => {
    const tokens = sandboxFrame({ srcdoc: '' }).sandbox.split(' ');
    for (const t of ['allow-same-origin', 'allow-top-navigation', 'allow-popups']) expect(tokens).not.toContain(t);
  });

  it('loads only inline HTML or a blob: URL', () => {
    expect(() => sandboxFrame({ blob: 'https://elsewhere.example/module.html' })).toThrow('blob');
    expect(() => sandboxFrame({ blob: 'data:text/html,<p>module</p>' })).toThrow('blob');
  });
});

describe('handOverPort', () => {
  it('posts the module its end of a fresh channel and keeps the client\'s end', async () => {
    const posted: { message: unknown; origin: string; transfer: Transferable[] }[] = [];
    const client = handOverPort({ postMessage: (message, origin, transfer) => posted.push({ message, origin, transfer }) });
    expect(posted).toHaveLength(1);
    const [{ message, origin, transfer }] = posted;
    expect(message).toEqual(HAND_OVER);
    expect(origin).toBe('*');
    expect(transfer).toHaveLength(1);
    const module = transfer[0] as MessagePort;
    open.push(client, module);
    const heard = new Promise(resolve => (client.onmessage = e => resolve(e.data)));
    module.postMessage('hello');
    expect(await heard).toBe('hello');
  });
});

describe('sandboxPage', () => {
  const code = new TextEncoder().encode(
    "export default { connect: port => ({ port }), install(api) { globalThis.__p5frame.push(api.port.name); } };"
  );

  it('carries the module as base64, so nothing in it can end the script', () => {
    const page = sandboxPage(new TextEncoder().encode('</script><script>alert(1)</script>'));
    expect(page).not.toContain('alert(1)');
    expect(page.match(/<\/script>/g)).toHaveLength(1);
  });

  /** Runs the page's script against a fake frame window and returns its message listener. */
  function frameScript(page: string, parent: object) {
    const script = /<script>([\s\S]*)<\/script>/.exec(page)?.[1] ?? '';
    let listener: ((e: unknown) => Promise<void>) | undefined;
    // vitest's runner cannot import from inside new Function: hand the page its import.
    const load = (url: string) => import(/* @vite-ignore */ url);
    new Function('addEventListener', 'parent', 'load', script.replace('await import(', 'await load('))(
      (_: string, fn: typeof listener) => (listener = fn),
      parent,
      load
    );
    if (!listener) throw new Error('no listener');
    return listener;
  }

  it('runs the module with the port of the parent\'s hand-over, once', async () => {
    const ran: string[] = [];
    (globalThis as { __p5frame?: string[] }).__p5frame = ran;
    const parent = {};
    const listener = frameScript(sandboxPage(code), parent);
    await listener({ source: {}, data: HAND_OVER, ports: [{ name: 'stranger' }] });
    await listener({ source: parent, data: { muModuleApi: 99 }, ports: [{ name: 'old' }] });
    await listener({ source: parent, data: HAND_OVER, ports: [{ name: 'first' }] });
    await listener({ source: parent, data: HAND_OVER, ports: [{ name: 'second' }] });
    expect(ran).toEqual(['first']);
  });
});
