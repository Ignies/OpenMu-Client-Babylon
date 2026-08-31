import en from './en';

export type LocalizationsKeys = keyof L[keyof L];

type L = typeof allLanguages;
type Localization = {
  [K in keyof L]: Record<LocalizationsKeys, string> & Record<string, string>;
};

const allLanguages = { en };

export const SUPPORTED_LOCALES = Object.keys(allLanguages) as Locales[];

export const Localizations = allLanguages as Localization;

export type Locales = keyof typeof allLanguages;

const DEFAULT_LOCALE: Locales = 'en';

export function detectBrowserLocale() {
  //@ts-ignore
  const lang: string = navigator.language || navigator.userLanguage;

  if (lang) {
    let l = lang;
    if (lang.length > 2) {
      l = lang[0] + lang[1];
    }

    if (l) {
      l = l.toLowerCase();
    }

    if (SUPPORTED_LOCALES.includes(l as any)) {
      return l as any;
    }
  }

  return DEFAULT_LOCALE;
}

let currentLocale: Locales = detectBrowserLocale();

export function setCurrentLocale(locale: Locales) {
  currentLocale = locale;
}

export const getCurrentLocale = (): Locales => currentLocale;

type Params = Record<string, string>;

const defParam: Params = {};

export const LL = <S extends string>(
  key: LocalizationsKeys | S,
  paramsOrLocale: Params | Locales = defParam,
  locale: Locales = getCurrentLocale()
): string => {
  let params = defParam;

  if (typeof paramsOrLocale === 'string') {
    locale = paramsOrLocale;
  } else if (Object.keys(paramsOrLocale).length > 0) {
    params = paramsOrLocale;
  }

  const dictLang = Localizations[locale];

  if (!dictLang) return key;

  let translate = dictLang[key];

  if (translate === undefined) {
    //try default lang
    if (locale !== DEFAULT_LOCALE) {
      return LL(key, paramsOrLocale, DEFAULT_LOCALE);
    }
    return key;
  }

  if (params === defParam) return translate;

  const re = /\$\{(\w+)\}/;
  const stringKeys = translate.match(new RegExp(re, 'gm'));

  if (!stringKeys) return translate;

  for (const stringKey of stringKeys) {
    const prop = stringKey.match(re)![1];

    if (params[prop] === undefined) {
      throw new Error(`Key ${prop} not found in params`);
    }

    translate = translate.replace(stringKey, params[prop]);
  }

  return translate;
};

export const hasLocalizationForKey = (
  key: string,
  locale: Locales = getCurrentLocale()
): boolean => {
  const lang = Localizations[locale];

  if (lang == null) return false;

  return lang[key] != null;
};
