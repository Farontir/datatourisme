'use client';

import React from 'react';
import { useLocale, useLocaleSwitch, useTranslation } from '../hooks/use-locale';
import { SUPPORTED_LOCALES, LOCALE_METADATA } from '../types';
import type { SupportedLocale } from '../types';

interface LocaleSwitcherProps {
  variant?: 'dropdown' | 'tabs' | 'flags';
  className?: string;
  showNativeNames?: boolean;
}

export function LocaleSwitcher({ 
  variant = 'dropdown', 
  className = '',
  showNativeNames = true 
}: LocaleSwitcherProps) {
  const { locale } = useLocale();
  const { switchToLocale } = useLocaleSwitch();
  const { t } = useTranslation();

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    switchToLocale(newLocale);
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value as SupportedLocale)}
          className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={t('nav.selectLanguage') || 'Select language'}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc} value={loc}>
              {showNativeNames 
                ? `${LOCALE_METADATA[loc].flag} ${LOCALE_METADATA[loc].nativeName}`
                : `${LOCALE_METADATA[loc].flag} ${LOCALE_METADATA[loc].name}`
              }
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    );
  }

  if (variant === 'tabs') {
    return (
      <div className={`flex space-x-1 ${className}`}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              locale === loc
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-pressed={locale === loc}
          >
            {LOCALE_METADATA[loc].flag} {LOCALE_METADATA[loc].code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'flags') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
              locale === loc
                ? 'ring-2 ring-blue-500 scale-110'
                : 'hover:scale-105'
            }`}
            title={showNativeNames ? LOCALE_METADATA[loc].nativeName : LOCALE_METADATA[loc].name}
            aria-label={`Switch to ${LOCALE_METADATA[loc].name}`}
          >
            {LOCALE_METADATA[loc].flag}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

export function LocaleSwitcherCompact({ className = '' }: { className?: string }) {
  const { locale } = useLocale();
  const { switchToLocale } = useLocaleSwitch();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          const currentIndex = SUPPORTED_LOCALES.indexOf(locale);
          const nextIndex = (currentIndex + 1) % SUPPORTED_LOCALES.length;
          switchToLocale(SUPPORTED_LOCALES[nextIndex]);
        }}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        title="Switch language"
      >
        <span className="text-lg">{LOCALE_METADATA[locale].flag}</span>
        <span className="uppercase">{LOCALE_METADATA[locale].code}</span>
      </button>
    </div>
  );
}