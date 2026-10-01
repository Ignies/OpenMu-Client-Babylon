import { defineWindow } from '@/controllers/interface/windows';
import { CashShop } from '.';

export default defineWindow({ id: 'cash_shop', slot: 'hud', order: 180, component: CashShop });
