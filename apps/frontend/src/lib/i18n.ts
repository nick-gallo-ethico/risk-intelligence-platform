'use client';

import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { useCallback } from 'react';

/**
 * Supported languages for the Ethics Portal.
 * Each language has a code, display name, and text direction (ltr/rtl).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'es', name: 'Espanol', dir: 'ltr' as const },
  { code: 'fr', name: 'Francais', dir: 'ltr' as const },
  { code: 'de', name: 'Deutsch', dir: 'ltr' as const },
  { code: 'pt', name: 'Portugues', dir: 'ltr' as const },
  { code: 'zh', name: 'Chinese', dir: 'ltr' as const },
  { code: 'ar', name: 'Arabic', dir: 'rtl' as const },
  { code: 'he', name: 'Hebrew', dir: 'rtl' as const },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type TextDirection = 'ltr' | 'rtl';

export interface SupportedLanguage {
  code: LanguageCode;
  name: string;
  dir: TextDirection;
}

/**
 * Translation namespaces (lazy-loaded).
 * - common: Shared UI elements, buttons, labels
 * - report: Report submission form labels and messages
 * - status: Status check page content
 * - resources: Policies, FAQ, help content
 * - errors: Error messages and validation
 */
export const NAMESPACES = [
  'common',
  'report',
  'status',
  'resources',
  'errors',
] as const;

export type TranslationNamespace = (typeof NAMESPACES)[number];

/**
 * Initialize i18next with HttpBackend for lazy loading,
 * LanguageDetector for auto-detection, and React integration.
 */
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',

    // Lazy load translation files from /locales/
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ethics-language',
    },

    interpolation: {
      escapeValue: false, // React handles XSS protection
    },

    react: {
      useSuspense: true,
    },
  });

export { i18n };
export default i18n;

/**
 * Hook for language management.
 * Provides the current language and a function to change it.
 * Changing language updates document.dir and document.lang for RTL support.
 */
export function useLanguage() {
  const { i18n: i18nInstance } = useTranslation();

  const changeLanguage = useCallback(
    async (code: string) => {
      const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
      if (lang) {
        await i18nInstance.changeLanguage(code);
        // Update document direction and language for RTL support
        if (typeof document !== 'undefined') {
          document.documentElement.dir = lang.dir;
          document.documentElement.lang = code;
        }
      }
    },
    [i18nInstance]
  );

  const currentLanguage: SupportedLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18nInstance.language) ||
    SUPPORTED_LANGUAGES[0];

  return {
    currentLanguage,
    changeLanguage,
    languages: SUPPORTED_LANGUAGES,
    isRTL: currentLanguage.dir === 'rtl',
  };
}
