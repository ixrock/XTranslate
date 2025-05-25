// Mapping language locale to country flag in "flag-icons" package

export type FlagIconFilename = string;
export type FlagLocale = string;

export const flagIconToLangMap: Record<FlagIconFilename, FlagLocale | FlagLocale[]> = {
  "al": "sq", // Albanian
  "am": "hy", // Armenian
  "ph": "ce", // Cebuano (Philippines)
  "bd": "bn", // Bengali (Bangladesh)
  "mw": "ny", // Malawi, Zambia, Mozambique, Zimbabwe
  "cz": "cs", // Czech Republic
  "dk": "da", // Danish
  "gb": "en", // English
  "gr": "el", // Greek
  "ge": "ka", // Georgian
  "ne": "ha", // Hausa (West Africa)
  "hm": "haw", // Hawaiian
  "in": ["hi", "te"], // Hindi (India), Telugu (India)
  "tj": "tg", // Tajik (Tajikistan)
  "pk": "ur", // Urdu (Pakistan)
  "jp": "ja", // Japanese
  "kr": "ko", // Korean
  "la": "lo", // Laos
  "lk": "si", // Sinhala (Sri Lanka)
  "si": "sl", // Slovenia
  "se": "sv", // Sweden
  "ua": "uk", // Ukrainian
  "ir": "fa", // Iran (Persian)
  "iq": "ku", // Iraq, Kurdistan Region
  "nz": "ma", // Maori (New Zealand)
  "ke": "sw", // Swahili (Kenya, Rwanda, Tanzania, Uganda)
  "cn": ["zh-CN", "zh-Hans", "lzh", "zh"], // Chinese
  "tw": ["zh-TW", "zh-Hant"], // Chinese (Taiwan)
  "ng": "yo", // Yoruba (Nigeria)
  "za": ["zu", "xh"], // Zulu (South Africa), Xhosa (South Africa)
  "vn": "vi", // Vietnamese
  "arab": ["ar", "arz", "ary", "arb"], // Arabic
  "rs": "sr", // Serbian
  "no": "nb", // Norwegian
  "pt": ["pt-pt", "pt-br"], // Portuguese
};

export function getFlagIcon(locale: string): string | undefined {
  try {
    const localeCommon = locale.split("-")[0];

    const flagIcon = Object.entries(flagIconToLangMap).find(([flagIcon, locales]) => {
      locales = [locales].flat();
      return locales.includes(locale) || locales.includes(localeCommon);
    })?.[0] ?? locale;

    return require(`flag-icons/flags/4x3/${flagIcon}.svg`);
  } catch (error) {
    return undefined; // noop
  }
}
