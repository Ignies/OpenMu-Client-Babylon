import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportLoadFailure, settle } from './loadFailure';

afterEach(() => vi.restoreAllMocks());

describe('reportLoadFailure', () => {
  it('warns once per file and swallows the error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onError = reportLoadFailure('Effect/once.OZT');

    await Promise.reject(new Error('404')).catch(onError);
    await Promise.reject(new Error('404')).catch(reportLoadFailure('Effect/once.OZT'));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('Effect/once.OZT');
  });

  it('warns again for a different file', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await Promise.reject(new Error('a')).catch(reportLoadFailure('Effect/a.OZT'));
    await Promise.reject(new Error('b')).catch(reportLoadFailure('Effect/b.OZT'));

    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('settle', () => {
  it('passes a loaded value through without warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(settle(Promise.resolve(7), 'Effect/ok.OZT')).resolves.toBe(7);
    expect(warn).not.toHaveBeenCalled();
  });

  it('resolves a failed load to undefined and reports it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(settle(Promise.reject(new Error('404')), 'Effect/gone.OZT')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
