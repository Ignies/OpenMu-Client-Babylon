/** Portuguese text of the `personal_shop` module. */

import type en from './en';

export default {
  'personalShop.disabled':
    'As lojas pessoais estão desligadas neste servidor.',
  'personalShop.slotNotInShop': 'Esse espaço não faz parte da loja.',
  'personalShop.priceNotSet': 'Não foi possível definir o preço.',
} satisfies Partial<Record<keyof typeof en, string>>;
