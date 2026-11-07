import { describe, expect, it } from 'vitest';
import { loadGateConfig, worstProbe } from './gate';

describe('gate config', () => {
  it('reads every game port to probe', () => {
    // OpenMU 0.10.1 moved the game servers from 55901 to 45901; a box can run either.
    expect(loadGateConfig({ GAME_PROBE_PORT: '45901,55901' }).gamePorts).toEqual([45901, 55901]);
    expect(loadGateConfig({ GAME_PROBE_PORT: '55901' }).gamePorts).toEqual([55901]);
  });

  it('drops what is not a port', () => {
    expect(loadGateConfig({}).gamePorts).toEqual([]);
    expect(loadGateConfig({ GAME_PROBE_PORT: '0, 70000,abc, 45901' }).gamePorts).toEqual([45901]);
  });
});

describe('worstProbe', () => {
  const closed = { outcome: 'closed' as const, detail: 'refused' };
  const open = { outcome: 'open' as const, detail: 'connected' };
  const unsure = { outcome: 'inconclusive' as const, detail: 'timed out' };

  it('is closed only when every port is closed', () => {
    expect(worstProbe([closed, closed]).outcome).toBe('closed');
  });

  it('is open when any port answers, whichever range it is in', () => {
    expect(worstProbe([closed, open]).outcome).toBe('open');
    expect(worstProbe([open, unsure]).outcome).toBe('open');
  });

  it('is inconclusive when a port could not be probed and none answered', () => {
    expect(worstProbe([closed, unsure]).outcome).toBe('inconclusive');
  });
});
