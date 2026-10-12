/** Korean text of the streamed modules (`src/modules/_api`). */

import type en from './en';

export default {
  'moduleStream.dropped': '이 월드에 읽을 수 없는 모듈이 있습니다({id}): 건너뜀',
  'moduleStream.api': '모듈 {id}에는 모듈 API {range}가 필요하지만 이 클라이언트는 {have}입니다: 건너뜀',
  'moduleStream.download': '모듈 {id}을(를) 내려받지 못했습니다: 건너뜀',
  'moduleStream.hash': '모듈 {id}이(가) 해시와 일치하지 않습니다: 건너뜀',
  'moduleStream.core': '모듈 {id}이(가) 핵심 모듈이라고 주장합니다: 거부됨',
  'moduleStream.builtIn': '모듈 {id}이(가) 내장 모듈과 이름이 같습니다: 거부됨',
  'moduleStream.declined': '모듈 {id}이(가) 허용되지 않았습니다: 건너뜀',
  'moduleStream.failed': '모듈 {id}을(를) 시작하지 못했습니다: 해제됨',
} satisfies Partial<Record<keyof typeof en, string>>;
