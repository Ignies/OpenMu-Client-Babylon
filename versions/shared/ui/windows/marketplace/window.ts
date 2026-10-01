import { defineWindow } from '@/controllers/interface/windows';
import { MarketplaceWindow } from '.';

export default defineWindow({ id: 'marketplace', slot: 'hud', order: 190, component: MarketplaceWindow });
