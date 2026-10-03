/** Thai text of the `item_search` interface widget. */

import type en from './en';

export default {
  'search.placeholder': 'ค้นหา...',
  'search.hint': 'พิมพ์เพื่อให้สิ่งที่ไม่ตรงจางลง กด Esc เพื่อล้าง',
} satisfies Partial<Record<keyof typeof en, string>>;
