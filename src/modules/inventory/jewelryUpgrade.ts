import { isOn } from '@/controllers/fidelity';
import { serverSetting } from '../servers/serverManifest';

/** Ours: rings and pendants take Bless, Soul and Life with the improvement on a world that allows it. */
export const jewelryUpgradeAllowed = (): boolean => isOn('jewelryUpgrade') && serverSetting('jewelryUpgrade');
