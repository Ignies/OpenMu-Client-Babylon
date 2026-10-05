import { afterEach, describe, expect, it } from 'vitest';
import { HAND_OVER, handOverPort, sandboxFrame } from './sandbox';

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
