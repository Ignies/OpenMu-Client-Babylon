/** Romanian text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Magazin personal',
  'personalShop.button': 'Magazin',
  'personalShop.selling': 'Magazinul tău este deschis',
  'personalShop.namePlaceholder': 'Numele magazinului',
  'personalShop.openTip': 'Deschide magazinul',
  'personalShop.closeTip': 'Închide magazinul',
  'personalShop.info1': 'Pune un preț pe fiecare obiect înainte să deschizi.',
  'personalShop.info2': 'Magazinul se închide dacă te miști sau ieși din joc.',
  'personalShop.info3': 'Cumpărătorii trebuie să stea lângă tine.',
  'personalShop.info4': 'Obiectele cu preț nu pot fi folosite sau aruncate.',
  'personalShop.info5': 'Zenul ajunge direct în inventarul tău.',
  'personalShop.warn1': 'Nu vinde niciodată sub valoarea obiectului.',
  'personalShop.warn2': 'Serverul are ultimul cuvânt la prețuri.',
} satisfies Partial<Record<keyof typeof en, string>>;
