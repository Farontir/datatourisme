// Supported locales for DataTourisme
export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Default locale
export const DEFAULT_LOCALE: SupportedLocale = 'fr';

// Locale metadata
export interface LocaleMetadata {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  currency: string;
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
}

// Locale configuration  
export const LOCALE_METADATA: Record<SupportedLocale, LocaleMetadata> = {
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
    },
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  nl: {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    direction: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd-MM-yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
};

// Browser locale detection result
export interface LocaleDetectionResult {
  locale: SupportedLocale;
  confidence: 'high' | 'medium' | 'low';
  source: 'url' | 'cookie' | 'browser' | 'geo' | 'default';
}

// Locale detection strategies
export type LocaleDetectionStrategy = 'url' | 'cookie' | 'browser' | 'geo' | 'default';

// Combined locale messages type
export type LocaleMessages = Record<string, string>;

// Translation namespace types
export interface CommonMessages {
  // Navigation
  'nav.home': string;
  'nav.search': string;
  'nav.favorites': string;
  'nav.bookings': string;
  'nav.profile': string;
  'nav.signIn': string;
  'nav.signOut': string;
  
  // Common actions
  'action.save': string;
  'action.cancel': string;
  'action.continue': string;
  'action.back': string;
  'action.next': string;
  'action.finish': string;
  'action.edit': string;
  'action.delete': string;
  'action.share': string;
  'action.download': string;
  
  // Common labels
  'label.email': string;
  'label.password': string;
  'label.name': string;
  'label.phone': string;
  'label.address': string;
  'label.city': string;
  'label.country': string;
  'label.optional': string;
  'label.required': string;
  
  // Status messages
  'status.loading': string;
  'status.saving': string;
  'status.saved': string;
  'status.error': string;
  'status.success': string;
  'status.offline': string;
  'status.online': string;
  
  // Time and dates
  'time.now': string;
  'time.today': string;
  'time.yesterday': string;
  'time.tomorrow': string;
  'time.thisWeek': string;
  'time.nextWeek': string;
  'time.thisMonth': string;
  'time.nextMonth': string;
}

export interface AuthMessages {
  // Sign in
  'auth.signIn.title': string;
  'auth.signIn.subtitle': string;
  'auth.signIn.button': string;
  'auth.signIn.forgotPassword': string;
  'auth.signIn.noAccount': string;
  'auth.signIn.createAccount': string;
  
  // Sign up
  'auth.signUp.title': string;
  'auth.signUp.subtitle': string;
  'auth.signUp.button': string;
  'auth.signUp.hasAccount': string;
  'auth.signUp.signIn': string;
  'auth.signUp.terms': string;
  'auth.signUp.privacy': string;
  
  // Errors
  'auth.error.invalidCredentials': string;
  'auth.error.userExists': string;
  'auth.error.weakPassword': string;
  'auth.error.networkError': string;
  'auth.error.serverError': string;
}

export interface BookingMessages {
  // Wizard steps
  'booking.step.selection': string;
  'booking.step.details': string;
  'booking.step.payment': string;
  'booking.step.confirmation': string;
  
  // Selection step
  'booking.selection.date': string;
  'booking.selection.time': string;
  'booking.selection.guests': string;
  'booking.selection.guestCount': string;
  'booking.selection.availableSlots': string;
  'booking.selection.noAvailability': string;
  
  // Guest details
  'booking.details.primaryContact': string;
  'booking.details.guestDetails': string;
  'booking.details.specialRequirements': string;
  'booking.details.accessibility': string;
  
  // Payment
  'booking.payment.method': string;
  'booking.payment.total': string;
  'booking.payment.processing': string;
  'booking.payment.secure': string;
  'booking.payment.applePay': string;
  'booking.payment.googlePay': string;
  
  // Confirmation
  'booking.confirmation.title': string;
  'booking.confirmation.subtitle': string;
  'booking.confirmation.number': string;
  'booking.confirmation.details': string;
  'booking.confirmation.downloadPDF': string;
  'booking.confirmation.addCalendar': string;
}

export interface SearchMessages {
  // Search interface
  'search.placeholder': string;
  'search.button': string;
  'search.filters': string;
  'search.results': string;
  'search.noResults': string;
  'search.loading': string;
  
  // Filters
  'search.filter.category': string;
  'search.filter.location': string;
  'search.filter.date': string;
  'search.filter.price': string;
  'search.filter.rating': string;
  'search.filter.availability': string;
  'search.filter.clear': string;
  'search.filter.apply': string;
  
  // Results
  'search.result.from': string;
  'search.result.perPerson': string;
  'search.result.available': string;
  'search.result.bookNow': string;
  'search.result.addFavorite': string;
  'search.result.removeFavorite': string;
}

// Message type mapping
export interface Messages {
  common: CommonMessages;
  auth: AuthMessages;
  booking: BookingMessages;
  search: SearchMessages;
}