// Types
export type {
  SupportedLocale,
  LocaleMetadata,
  LocaleMessages,
  LocaleDetectionResult,
  LocaleDetectionStrategy,
  CommonMessages,
  AuthMessages,
  BookingMessages,
  SearchMessages,
} from './types';

// Constants
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_METADATA,
} from './types';

// Components
export {
  IntlProvider,
  useIntl,
  createIntlInstance,
} from './components/intl-provider';

export {
  LocaleSwitcher,
  LocaleSwitcherCompact,
} from './components/locale-switcher';

// Hooks
export {
  useLocale,
  useTranslation,
  useLocaleSwitch,
} from './hooks/use-locale';

// Services
export {
  LocaleDetectionService,
} from './locale-detection';

// Re-export React Intl utilities that might be useful
export {
  FormattedMessage,
  FormattedDate,
  FormattedTime,
  FormattedNumber,
  FormattedPlural,
  FormattedRelativeTime,
  useIntl as useReactIntl,
} from 'react-intl';