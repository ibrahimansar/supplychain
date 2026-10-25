/**
 * Every language the interface ships in.
 *
 * `nativeName` is what the picker shows, deliberately untranslated — someone
 * looking for their own language recognises it in its own script far faster
 * than a translated label they cannot read. `dir` drives the document
 * direction, so adding a right-to-left language needs no change anywhere else.
 */
export const LOCALE_META = [
  { code: 'en', nativeName: 'English',    englishName: 'English',    dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية',     englishName: 'Arabic',     dir: 'rtl' },
  { code: 'ur', nativeName: 'اردو',        englishName: 'Urdu',       dir: 'rtl' },
  { code: 'fa', nativeName: 'فارسی',       englishName: 'Persian',    dir: 'rtl' },
  { code: 'ta', nativeName: 'தமிழ்',       englishName: 'Tamil',      dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी',        englishName: 'Hindi',      dir: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা',        englishName: 'Bengali',    dir: 'ltr' },
  { code: 'ml', nativeName: 'മലയാളം',     englishName: 'Malayalam',  dir: 'ltr' },
  { code: 'te', nativeName: 'తెలుగు',       englishName: 'Telugu',     dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr' },
  { code: 'ms', nativeName: 'Bahasa Melayu',    englishName: 'Malay',  dir: 'ltr' },
  { code: 'tr', nativeName: 'Türkçe',      englishName: 'Turkish',    dir: 'ltr' },
  { code: 'fr', nativeName: 'Français',    englishName: 'French',     dir: 'ltr' },
  { code: 'es', nativeName: 'Español',     englishName: 'Spanish',    dir: 'ltr' },
];

export const LOCALE_CODES = LOCALE_META.map((l) => l.code);

export const RTL_LOCALES = LOCALE_META.filter((l) => l.dir === 'rtl').map((l) => l.code);

export const isRtlLocale = (code) => RTL_LOCALES.includes(code);

export const localeMeta = (code) =>
  LOCALE_META.find((l) => l.code === code) || LOCALE_META[0];
