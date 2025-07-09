import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale, type LocaleDetectionResult } from './types';

// Cookie name for storing user's locale preference
const LOCALE_COOKIE_NAME = 'datatourisme-locale';

/**
 * Detects the user's preferred locale using multiple strategies
 */
export class LocaleDetectionService {
  /**
   * Detects locale from URL pathname (e.g., /fr/search, /en/bookings)
   */
  static detectFromUrl(pathname: string): LocaleDetectionResult | null {
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];
    
    if (firstSegment && SUPPORTED_LOCALES.includes(firstSegment as SupportedLocale)) {
      return {
        locale: firstSegment as SupportedLocale,
        confidence: 'high',
        source: 'url',
      };
    }
    
    return null;
  }

  /**
   * Detects locale from cookie preference
   */
  static detectFromCookie(): LocaleDetectionResult | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${LOCALE_COOKIE_NAME}=`)
    );
    
    if (localeCookie) {
      const locale = localeCookie.split('=')[1];
      if (SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
        return {
          locale: locale as SupportedLocale,
          confidence: 'high',
          source: 'cookie',
        };
      }
    }
    
    return null;
  }

  /**
   * Detects locale from browser language preferences
   */
  static detectFromBrowser(): LocaleDetectionResult | null {
    if (typeof navigator === 'undefined') return null;
    
    const browserLanguages = navigator.languages || [navigator.language];
    
    // First, try exact matches
    for (const lang of browserLanguages) {
      const locale = lang.toLowerCase().split('-')[0];
      if (SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
        return {
          locale: locale as SupportedLocale,
          confidence: 'medium',
          source: 'browser',
        };
      }
    }
    
    // Then try partial matches for regional variants
    for (const lang of browserLanguages) {
      const fullLocale = lang.toLowerCase();
      
      // Handle regional variants (e.g., en-US -> en, fr-CA -> fr)
      if (fullLocale.startsWith('en')) {
        return {
          locale: 'en',
          confidence: 'medium',
          source: 'browser',
        };
      }
      if (fullLocale.startsWith('fr')) {
        return {
          locale: 'fr',
          confidence: 'medium',
          source: 'browser',
        };
      }
      if (fullLocale.startsWith('es')) {
        return {
          locale: 'es',
          confidence: 'medium',
          source: 'browser',
        };
      }
      if (fullLocale.startsWith('de')) {
        return {
          locale: 'de',
          confidence: 'medium',
          source: 'browser',
        };
      }
      if (fullLocale.startsWith('it')) {
        return {
          locale: 'it',
          confidence: 'medium',
          source: 'browser',
        };
      }
      if (fullLocale.startsWith('nl')) {
        return {
          locale: 'nl',
          confidence: 'medium',
          source: 'browser',
        };
      }
    }
    
    return null;
  }

  /**
   * Detects locale from geolocation/IP (simulated for now)
   * In production, this would use a geolocation service
   */
  static async detectFromGeolocation(): Promise<LocaleDetectionResult | null> {
    try {
      // Simulate geo-IP detection with a simple country->locale mapping
      // In production, you'd use a service like MaxMind, ipapi.co, or CloudFlare
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      const countryToLocale: Record<string, SupportedLocale> = {
        'FR': 'fr',
        'US': 'en',
        'GB': 'en',
        'CA': 'en',
        'AU': 'en',
        'ES': 'es',
        'MX': 'es',
        'AR': 'es',
        'DE': 'de',
        'AT': 'de',
        'CH': 'de',
        'IT': 'it',
        'NL': 'nl',
        'BE': 'nl',
      };
      
      const locale = countryToLocale[data.country_code];
      if (locale) {
        return {
          locale,
          confidence: 'low',
          source: 'geo',
        };
      }
    } catch (error) {
      console.warn('Geolocation detection failed:', error);
    }
    
    return null;
  }

  /**
   * Comprehensive locale detection using all available strategies
   */
  static async detectLocale(pathname?: string): Promise<LocaleDetectionResult> {
    // Strategy 1: Check URL first (highest priority)
    if (pathname) {
      const urlResult = this.detectFromUrl(pathname);
      if (urlResult) return urlResult;
    }
    
    // Strategy 2: Check user's saved preference
    const cookieResult = this.detectFromCookie();
    if (cookieResult) return cookieResult;
    
    // Strategy 3: Check browser language
    const browserResult = this.detectFromBrowser();
    if (browserResult) return browserResult;
    
    // Strategy 4: Try geolocation (async, low confidence)
    try {
      const geoResult = await this.detectFromGeolocation();
      if (geoResult) return geoResult;
    } catch (error) {
      console.warn('Geo detection failed:', error);
    }
    
    // Fallback: Use default locale
    return {
      locale: DEFAULT_LOCALE,
      confidence: 'low',
      source: 'default',
    };
  }

  /**
   * Saves user's locale preference to cookie
   */
  static saveLocalePreference(locale: SupportedLocale): void {
    if (typeof document === 'undefined') return;
    
    // Set cookie for 1 year
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
  }

  /**
   * Gets the current locale from cookie or returns default
   */
  static getCurrentLocale(): SupportedLocale {
    const cookieResult = this.detectFromCookie();
    return cookieResult?.locale || DEFAULT_LOCALE;
  }

  /**
   * Clears the saved locale preference
   */
  static clearLocalePreference(): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${LOCALE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  /**
   * Validates if a locale string is supported
   */
  static isValidLocale(locale: string): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
  }

  /**
   * Gets the best fallback locale for an unsupported locale
   */
  static getFallbackLocale(locale: string): SupportedLocale {
    // Try language part of locale (e.g., 'en-US' -> 'en')
    const language = locale.toLowerCase().split('-')[0];
    
    if (this.isValidLocale(language)) {
      return language;
    }
    
    // Language family fallbacks
    const fallbackMap: Record<string, SupportedLocale> = {
      'pt': 'es', // Portuguese -> Spanish
      'ca': 'es', // Catalan -> Spanish
      'eu': 'es', // Basque -> Spanish
      'gl': 'es', // Galician -> Spanish
      'sv': 'en', // Swedish -> English
      'no': 'en', // Norwegian -> English
      'da': 'en', // Danish -> English
      'fi': 'en', // Finnish -> English
      'pl': 'de', // Polish -> German
      'cs': 'de', // Czech -> German
      'sk': 'de', // Slovak -> German
      'hu': 'de', // Hungarian -> German
      'ro': 'it', // Romanian -> Italian
      'hr': 'it', // Croatian -> Italian
      'sl': 'it', // Slovenian -> Italian
    };
    
    return fallbackMap[language] || DEFAULT_LOCALE;
  }
}