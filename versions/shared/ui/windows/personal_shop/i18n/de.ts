/** German text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Eigener Laden',
  'personalShop.button': 'Laden',
  'personalShop.selling': 'Dein Laden ist geöffnet',
  'personalShop.namePlaceholder': 'Ladenname',
  'personalShop.openTip': 'Laden öffnen',
  'personalShop.closeTip': 'Laden schließen',
  'personalShop.info1': 'Setze vor dem Öffnen auf jeden Gegenstand einen Preis.',
  'personalShop.info2': 'Der Laden schließt, wenn du dich bewegst oder ausloggst.',
  'personalShop.info3': 'Käufer müssen direkt neben dir stehen.',
  'personalShop.info4':
    'Gegenstände mit Preis lassen sich nicht benutzen oder ablegen.',
  'personalShop.info5': 'Das Zen geht direkt in dein Inventar.',
  'personalShop.warn1': 'Verkaufe nie unter Wert.',
  'personalShop.warn2': 'Der Server hat beim Preis das letzte Wort.',
} satisfies Partial<Record<keyof typeof en, string>>;
