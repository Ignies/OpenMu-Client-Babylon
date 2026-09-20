import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A fresh copy of the module: the install state is a singleton. */
async function load() {
  vi.resetModules();
  return import('./pwaInstall');
}

function fakePrompt(outcome: 'accepted' | 'dismissed') {
  const event = {
    prompted: 0,
    prompt() {
      event.prompted += 1;
      return Promise.resolve();
    },
    userChoice: Promise.resolve({ outcome }),
  };
  return event;
}

describe('installing the client', () => {
  beforeEach(() => vi.resetModules());

  it('has nothing to spend until the browser offers one', async () => {
    const { PwaInstall, installApp } = await load();

    expect(PwaInstall.canPrompt).toBe(false);
    await expect(installApp()).resolves.toBe('unavailable');
  });

  it('spends a held prompt and records the install', async () => {
    const { PwaInstall, installApp } = await load();
    const event = fakePrompt('accepted');

    PwaInstall.hold(event as never);
    expect(PwaInstall.canPrompt).toBe(true);

    await expect(installApp()).resolves.toBe('installed');
    expect(event.prompted).toBe(1);
    expect(PwaInstall.installed).toBe(true);
  });

  it('keeps the row pressable after a refusal, with nothing left to spend', async () => {
    const { PwaInstall, installApp } = await load();

    PwaInstall.hold(fakePrompt('dismissed') as never);

    await expect(installApp()).resolves.toBe('dismissed');
    expect(PwaInstall.installed).toBe(false);
    // The event is dead whatever the answer was: a second press has to wait
    // for the browser to offer again.
    expect(PwaInstall.canPrompt).toBe(false);
    await expect(installApp()).resolves.toBe('unavailable');
  });

  it('does not offer to install what is already installed', async () => {
    const { PwaInstall, installApp } = await load();

    PwaInstall.markInstalled();
    PwaInstall.hold(fakePrompt('accepted') as never);

    expect(PwaInstall.canPrompt).toBe(false);
    await expect(installApp()).resolves.toBe('installed');
  });

  it('says nothing about a second press while the dialog is up', async () => {
    const { PwaInstall, installApp } = await load();

    PwaInstall.hold(fakePrompt('accepted') as never);

    const first = installApp();
    // Pressed again before the browser answered: not a browser that cannot
    // install, so the window has nothing to explain.
    await expect(installApp()).resolves.toBe('busy');
    await expect(first).resolves.toBe('installed');
  });
});
