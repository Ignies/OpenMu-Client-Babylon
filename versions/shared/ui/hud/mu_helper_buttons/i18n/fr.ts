/** French text of the `mu_helper_buttons` HUD element. */

import type en from './en';

export default {
  'muHelperButtons.start': "Lancer l'assistant",
  'muHelperButtons.stop': "Arrêter l'assistant",
  'muHelperButtons.settings': "Réglages de l'assistant",
} satisfies Partial<Record<keyof typeof en, string>>;
