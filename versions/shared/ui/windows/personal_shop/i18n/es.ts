/** Spanish text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Tienda personal',
  'personalShop.button': 'Tienda',
  'personalShop.selling': 'Tu tienda está abierta al público',
  'personalShop.namePlaceholder': 'Nombre de la tienda',
  'personalShop.openTip': 'Abrir la tienda',
  'personalShop.closeTip': 'Cerrar la tienda',
  'personalShop.info1': 'Pon precio a cada objeto antes de abrir.',
  'personalShop.info2': 'La tienda cierra si te mueves o te desconectas.',
  'personalShop.info3': 'Los compradores deben estar a tu lado.',
  'personalShop.info4': 'Los objetos con precio no se usan ni se tiran.',
  'personalShop.info5': 'El Zen va directo a tu inventario.',
  'personalShop.warn1': 'No vendas por menos de lo que vale.',
  'personalShop.warn2': 'El servidor tiene la última palabra sobre el precio.',
} satisfies Partial<Record<keyof typeof en, string>>;
