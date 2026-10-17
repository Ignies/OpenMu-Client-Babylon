/** hi text of `versions/shared/ui/components/auto_download`. */

import type en from './en';

export default {
  'autoDownload.title': 'गेम डेटा डाउनलोड हो रहा है',
  'autoDownload.done': 'गेम डेटा डाउनलोड हो गया',
  'autoDownload.cancel': 'रद्द करें',
  'autoDownload.hide': 'छिपाएँ (डाउनलोड जारी रहेगा)',
  'autoDownload.phase.map': 'नक्शा लोड हो रहा है: {name}',
  'autoDownload.phase.icons': 'आइटम लोड हो रहे हैं',
  'autoDownload.phase.audio': 'संगीत और ध्वनियाँ लोड हो रही हैं',
  'autoDownload.phase.monsters': 'पात्र और जीव लोड हो रहे हैं',
  'autoDownload.phase.core': 'इंटरफ़ेस और इफ़ेक्ट लोड हो रहे हैं',
  'autoDownload.left': '{left} MB बाकी',
  'autoDownload.received': '{total} MB में से {got} MB डाउनलोड हुआ',
  'autoDownload.screenTitle': 'आपका रोमांच तैयार हो रहा है',
  'autoDownload.screenText': 'ये फ़ाइलें रखी जाती हैं ताकि आपका अगला गेम जल्दी लोड हो। सिर्फ़ पहली बार।',
  'autoDownload.skip': 'फिर भी प्रवेश करें',
  'autoDownload.skipNote': 'डाउनलोड पृष्ठभूमि में जारी रहता है। गेम बंद करने पर यह वहीं से फिर शुरू होता है जहाँ रुका था।',
} satisfies Partial<Record<keyof typeof en, string>>;
