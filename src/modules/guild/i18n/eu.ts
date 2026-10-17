/** eu text of `src/modules/guild`. */

import type en from './en';

export default {
  'guild.memberLeft': '{name} jokalariak gremioa utzi du.',
  'guild.youLeft': 'Gremioa utzi duzu.',
  'guild.disbanded': 'Gremioa desegin da.',
  'guild.memberRemoved': 'Kidea gremiotik kendu da.',
  'guild.onlyMasterRemoves': 'Gremio-buruak bakarrik kanpora ditzake kideak.',
  'guild.wrongPassword': 'Idatzi duzun pasahitza okerra da.',
  'guild.created': 'Gremioa sortu da.',
  'guild.nameTaken': 'Gremio-izen hori hartuta dago jada.',
  'guild.createFailed': 'Ezin izan da gremioa sortu.',
  'guild.joinRefused': 'Gremio-buruak zure eskaera ukatu du.',
  'guild.joined': 'Gremioan sartu zara.',
  'guild.isFull': 'Gremioa beteta dago.',
  'guild.masterUnavailable': 'Gremio-burua ez dago eskuragarri.',
  'guild.masterBusy': 'Gremio-burua lanpetuta dago. Saiatu berriro geroago.',
  'guild.needLevel6': 'Gutxienez 6. maila behar duzu gremio batean sartzeko.',
} satisfies Partial<Record<keyof typeof en, string>>;
