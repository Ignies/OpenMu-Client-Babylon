import { defineWindow } from '@/controllers/interface/windows';
import { MyShop, ShopBrowser } from '.';

export default [
  defineWindow({ id: 'my_shop', module: 'personal_shop', slot: 'hud', order: 130, component: MyShop }),
  defineWindow({ id: 'shop_browser', slot: 'hud', order: 140, component: ShopBrowser }),
];
