import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { Social } = await import('./social');
const { GameOptions, setGameOption } = await import('@/controllers/settings');

describe('the System messages switch', () => {
  // The chat box's button (`m_bShowSystemMessages`) and Options share one saved setting (ours).
  it('is the saved chatSystemMessages option, on by default as the original', () => {
    const saved = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => saved.get(k) ?? null,
      setItem: (k: string, v: string) => void saved.set(k, v),
      removeItem: (k: string) => void saved.delete(k),
    });

    expect(Social.showSystemMessages).toBe(true);
    Social.toggle('showSystemMessages');
    expect(GameOptions.chatSystemMessages).toBe(false);
    expect(JSON.parse(saved.get('mu_options') ?? '{}').chatSystemMessages).toBe(false);

    setGameOption('chatSystemMessages', true);
    expect(Social.showSystemMessages).toBe(true);
    vi.unstubAllGlobals();
  });
});
