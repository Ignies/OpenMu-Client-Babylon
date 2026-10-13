// Stands in for '@/i18n' in this bundle: the site is English and the backdrop only needs the landing's
// credit lines, so the client's every-language glob (2 MB) stays out.
import en from '@versions/shared/ui/pages/preloader/i18n/en';

export type TextKey = keyof typeof en;

export function t(key: TextKey, vars: Record<string, string | number> = {}): string {
  return en[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
