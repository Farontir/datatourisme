'use client';

import { useIntl as useReactIntl } from 'react-intl';
import { useIntl } from '../components/intl-provider';
import type { SupportedLocale } from '../types';

export function useLocale() {
  const { locale, setLocale, isLoading } = useIntl();
  
  return {
    locale,
    setLocale,
    isLoading,
    isRTL: false, // Add RTL support if needed in future - none of current locales are RTL
  };
}

export function useTranslation() {
  const intl = useReactIntl();
  
  const t = (id: string, values?: Record<string, any>) => {
    try {
      return intl.formatMessage({ id }, values);
    } catch (error) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        console.warn(`Missing translation for key: ${id}`);
        return `[${id}]`;
      }
      return id;
    }
  };

  const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
    return intl.formatDate(date, options);
  };

  const formatTime = (date: Date | number, options?: Intl.DateTimeFormatOptions) => {
    return intl.formatTime(date, options);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return intl.formatNumber(value, options);
  };

  const formatCurrency = (value: number, currency = 'EUR', options?: Intl.NumberFormatOptions) => {
    return intl.formatNumber(value, {
      style: 'currency',
      currency,
      ...options,
    });
  };

  const formatRelativeTime = (value: number, unit: Intl.RelativeTimeFormatUnit) => {
    return intl.formatRelativeTime(value, unit);
  };

  const formatPlural = (value: number, options: any) => {
    return intl.formatPlural(value, options);
  };

  return {
    t,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatPlural,
    locale: intl.locale,
  };
}

export function useLocaleSwitch() {
  const { setLocale, locale } = useLocale();
  
  const switchToLocale = async (newLocale: SupportedLocale) => {
    if (newLocale === locale) return;
    
    try {
      await setLocale(newLocale);
      
      // Optionally reload the page to update URL-based routing
      if (typeof window !== 'undefined' && window.location.pathname.includes(`/${locale}`)) {
        const newPath = window.location.pathname.replace(`/${locale}`, `/${newLocale}`);
        window.history.pushState({}, '', newPath);
      }
    } catch (error) {
      console.error('Failed to switch locale:', error);
    }
  };

  return {
    switchToLocale,
    currentLocale: locale,
  };
}