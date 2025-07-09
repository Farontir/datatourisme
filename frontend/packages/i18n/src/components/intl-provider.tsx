'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { IntlProvider as ReactIntlProvider, createIntl, createIntlCache } from 'react-intl';
import type { SupportedLocale, LocaleMessages } from '../types';
import { LocaleDetectionService } from '../locale-detection';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../types';

interface IntlContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  isLoading: boolean;
  messages: LocaleMessages;
}

const IntlContext = createContext<IntlContextValue | null>(null);

interface IntlProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
  messages?: Partial<Record<SupportedLocale, LocaleMessages>>;
}

async function loadMessages(locale: SupportedLocale): Promise<LocaleMessages> {
  const [common, auth, booking, search] = await Promise.all([
    import(`../locales/${locale}/common.json`),
    import(`../locales/${locale}/auth.json`),
    import(`../locales/${locale}/booking.json`),
    import(`../locales/${locale}/search.json`),
  ]);

  return {
    ...common.default,
    ...auth.default,
    ...booking.default,
    ...search.default,
  };
}

export function IntlProvider({ children, initialLocale, messages }: IntlProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale || DEFAULT_LOCALE);
  const [currentMessages, setCurrentMessages] = useState<LocaleMessages>({});
  const [isLoading, setIsLoading] = useState(true);

  const setLocale = async (newLocale: SupportedLocale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) {
      console.warn(`Unsupported locale: ${newLocale}, falling back to ${DEFAULT_LOCALE}`);
      newLocale = DEFAULT_LOCALE;
    }

    setIsLoading(true);
    try {
      let newMessages: LocaleMessages;
      
      if (messages?.[newLocale]) {
        newMessages = messages[newLocale]!;
      } else {
        newMessages = await loadMessages(newLocale);
      }

      setLocaleState(newLocale);
      setCurrentMessages(newMessages);
      
      // Persist locale preference
      LocaleDetectionService.saveLocalePreference(newLocale);
      
      // Update document language
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }
    } catch (error) {
      console.error(`Failed to load messages for locale ${newLocale}:`, error);
      
      // Fallback to default locale
      if (newLocale !== DEFAULT_LOCALE) {
        await setLocale(DEFAULT_LOCALE);
        return;
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    async function initializeLocale() {
      if (initialLocale) {
        await setLocale(initialLocale);
        return;
      }

      try {
        const detectionResult = await LocaleDetectionService.detectLocale(
          typeof window !== 'undefined' ? window.location.pathname : undefined
        );
        await setLocale(detectionResult.locale);
      } catch (error) {
        console.error('Failed to detect locale:', error);
        await setLocale(DEFAULT_LOCALE);
      }
    }

    initializeLocale();
  }, [initialLocale]);

  const contextValue: IntlContextValue = {
    locale,
    setLocale,
    isLoading,
    messages: currentMessages,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider
        locale={locale}
        messages={currentMessages}
        defaultLocale={DEFAULT_LOCALE}
        onError={(error) => {
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            console.warn('React Intl Error:', error);
          }
        }}
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  );
}

export function useIntl() {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error('useIntl must be used within an IntlProvider');
  }
  return context;
}

// Create intl cache for better performance
const cache = createIntlCache();

export function createIntlInstance(locale: SupportedLocale, messages: LocaleMessages) {
  return createIntl(
    {
      locale,
      messages,
      defaultLocale: DEFAULT_LOCALE,
    },
    cache
  );
}