import { describe, expect, it } from 'vitest';
import { OPENMU_MAIN, hasReleaseImage, openmuSourceKind } from './openmu';

describe('openmuSourceKind', () => {
  it('tells a release, the main branch and a fixed ref apart', () => {
    expect(openmuSourceKind({ openmuSourceRef: '' })).toBe('release');
    expect(openmuSourceKind({ openmuSourceRef: OPENMU_MAIN })).toBe('main');
    expect(openmuSourceKind({ openmuSourceRef: 'f676dd259bbf' })).toBe('source');
  });
});

describe('hasReleaseImage', () => {
  const answer = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;

  it('asks Docker Hub for the munique/openmu tag', async () => {
    let asked = '';
    const spy = (async (url: string) => {
      asked = url;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;
    expect(await hasReleaseImage('0.10.1', spy)).toBe(true);
    expect(asked).toBe('https://hub.docker.com/v2/repositories/munique/openmu/tags/0.10.1');
  });

  it('says no when the release was tagged but never published as an image', async () => {
    expect(await hasReleaseImage('0.11.0', answer(404))).toBe(false);
  });

  it('assumes the image exists when Docker Hub cannot be asked', async () => {
    const offline = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await hasReleaseImage('0.9.10', offline)).toBe(true);
    expect(await hasReleaseImage('0.9.10', answer(503))).toBe(true);
  });
});
