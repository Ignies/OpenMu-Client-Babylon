/** Korean text of the `master_skills` window. */

import type en from './en';

export default {
  'master.spendPoint': '마스터 포인트 {points}을(를) {skill}에 쓸까요?',
  'master.spendPoints': '마스터 포인트 {points}을(를) {skill}에 쓸까요?',
  'master.skillFallback': '스킬 {number}',
} satisfies Partial<Record<keyof typeof en, string>>;
