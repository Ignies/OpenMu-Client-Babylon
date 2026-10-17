/** el text of `src/modules/_api`. */

import type en from './en';

export default {
  'moduleStream.dropped': 'Ο κόσμος αναφέρει ένα πρόσθετο που δεν διαβάζεται ({id}): παραλείφθηκε',
  'moduleStream.api':
    'Το πρόσθετο {id} χρειάζεται API πρόσθετων {range}, ο client προσφέρει {have}: παραλείφθηκε',
  'moduleStream.download': 'Το πρόσθετο {id} δεν μπόρεσε να ληφθεί: παραλείφθηκε',
  'moduleStream.hash': 'Το πρόσθετο {id} δεν ταιριάζει με το hash του: παραλείφθηκε',
  'moduleStream.core': 'Το πρόσθετο {id} δηλώνει ότι είναι βασικό πρόσθετο: απορρίφθηκε',
  'moduleStream.builtIn': 'Το πρόσθετο {id} έχει το όνομα ενσωματωμένου πρόσθετου: απορρίφθηκε',
  'moduleStream.declined': 'Το πρόσθετο {id} δεν επιτράπηκε: παραλείφθηκε',
  'moduleStream.failed': 'Το πρόσθετο {id} απέτυχε να ξεκινήσει: αφαιρέθηκε',
} satisfies Partial<Record<keyof typeof en, string>>;
