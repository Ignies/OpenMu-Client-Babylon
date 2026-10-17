/** hi text of `src/modules/session`. */

import type en from './en';

export default {
  'exit.chaosOpen': 'Chaos Machine की विंडो बंद करने के बाद गेम से बाहर निकलें।',
  'exit.noAnswer': 'सर्वर ने जवाब नहीं दिया। फिर भी बाहर निकल रहे हैं।',
  'resume.done': 'फिर से ऑनलाइन',
  'resume.failed': 'फिर से कनेक्ट नहीं हो सका',
  'resume.cancelled': 'फिर से कनेक्ट करना रद्द किया गया',
  'login.closingOldSession':
    'अकाउंट अभी भी कनेक्टेड है: पुराना सेशन बंद करके फिर से कोशिश कर रहे हैं...',
  'login.tokenRefused': 'आपका सहेजा हुआ लॉगिन पुराना हो गया है। अपना पासवर्ड डालें।',
  'login.tokenUnanswered': 'सर्वर ने सहेजे हुए लॉगिन का जवाब नहीं दिया। अपना पासवर्ड डालें।',
} satisfies Partial<Record<keyof typeof en, string>>;
