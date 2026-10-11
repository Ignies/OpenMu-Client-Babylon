import { defineWindow } from '@/controllers/interface/windows';
import { PerfReadout } from '.';

export default defineWindow({ id: 'perf_readout', slot: 'hud', order: 30, component: PerfReadout });
