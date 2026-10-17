/** hu text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Ez a világ olyan modult sorol fel, amely nem olvasható ({id}): kihagyva',
  'moduleStream.api':
    'A modulhoz ({id}) {range} modul-API kell, ez a kliens ezt adja: {have}. Kihagyva',
  'moduleStream.download': 'Nem sikerült letölteni a modult ({id}): kihagyva',
  'moduleStream.hash': 'A modul ({id}) nem egyezik a hash-ével: kihagyva',
  'moduleStream.core': 'A modul ({id}) alapmodulnak adja ki magát: elutasítva',
  'moduleStream.builtIn': 'A modul ({id}) neve egy beépített modulé: elutasítva',
  'moduleStream.declined': 'A modul ({id}) nem kapott engedélyt: kihagyva',
  'moduleStream.failed': 'A modul ({id}) nem tudott elindulni: eltávolítva',
} satisfies Partial<Record<keyof typeof en, string>>;
