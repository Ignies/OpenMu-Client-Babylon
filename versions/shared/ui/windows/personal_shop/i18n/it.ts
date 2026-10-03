/** Italian text of the `personal_shop` window. */

import type en from './en';

export default {
  'personalShop.title': 'Negozio personale',
  'personalShop.button': 'Negozio',
  'personalShop.selling': 'Il tuo negozio è aperto',
  'personalShop.namePlaceholder': 'Nome del negozio',
  'personalShop.openTip': 'Apri il negozio',
  'personalShop.closeTip': 'Chiudi il negozio',
  'personalShop.info1': 'Metti un prezzo su ogni oggetto prima di aprire.',
  'personalShop.info2': 'Il negozio chiude se ti muovi o esci dal gioco.',
  'personalShop.info3': 'I compratori devono stare accanto a te.',
  'personalShop.info4': 'Gli oggetti con prezzo non si usano né si gettano.',
  'personalShop.info5': 'Lo Zen finisce direttamente nel tuo inventario.',
  'personalShop.warn1': 'Non vendere mai sotto il valore di un oggetto.',
  'personalShop.warn2': 'L’ultima parola sui prezzi spetta al server.',
} satisfies Partial<Record<keyof typeof en, string>>;
