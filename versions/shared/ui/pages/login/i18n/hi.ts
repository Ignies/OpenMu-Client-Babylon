/** hi text of `versions/shared/ui/pages/login`. */

import type en from './en';

export default {
  'login.enterCredentials': 'अपना अकाउंट नाम और पासवर्ड डालें',
  'login.createAccount': 'अकाउंट बनाएं',
  'login.rememberMe': 'मुझे याद रखें?',
  'register.id': 'ID',
  'register.password': 'पासवर्ड',
  'register.confirm': 'पुष्टि करें',
  'register.fillEveryField': 'कृपया हर फ़ील्ड भरें।',
  'register.idTooShort': 'ID कम से कम {min} अक्षरों का होना चाहिए।',
  'register.idChars': 'ID में सिर्फ़ अक्षर और अंक हो सकते हैं।',
  'register.passwordTooShort': 'पासवर्ड कम से कम {min} अक्षरों का होना चाहिए।',
  'register.passwordChars': 'पासवर्ड में सिर्फ़ अक्षर, अंक और सामान्य चिह्न हो सकते हैं।',
  'register.mismatch': 'पासवर्ड मेल नहीं खाते।',
  'register.unreachable': 'सर्वर तक नहीं पहुंच सके।',
  'register.failed': 'रजिस्ट्रेशन विफल रहा ({status})।',
  'register.created': 'अकाउंट बन गया। अब आप लॉग इन कर सकते हैं।',
} satisfies Partial<Record<keyof typeof en, string>>;
