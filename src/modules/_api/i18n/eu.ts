/** eu text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped':
    'Mundu honek irakurri ezin den modulu bat zerrendatzen du ({id}): saltatuta',
  'moduleStream.api':
    '{id} moduluak {range} modulu-APIa behar du, bezero honek {have} eskaintzen du: saltatuta',
  'moduleStream.download': 'Ezin izan da {id} modulua deskargatu: saltatuta',
  'moduleStream.hash': '{id} modulua ez dator bat bere hash-arekin: saltatuta',
  'moduleStream.core': '{id} moduluak oinarrizko modulua dela dio: ukatuta',
  'moduleStream.builtIn': '{id} moduluak barneko modulu baten izena du: ukatuta',
  'moduleStream.declined': '{id} modulua ez da baimendu: saltatuta',
  'moduleStream.failed': '{id} moduluak huts egin du abiaraztean: deskargatuta',
} satisfies Partial<Record<keyof typeof en, string>>;
