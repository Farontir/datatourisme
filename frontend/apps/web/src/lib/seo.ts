import { Metadata } from 'next';

export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  structuredData?: Record<string, any>;
}

export interface TourismResource {
  id: string;
  name: string;
  description: string;
  category: {
    id: string;
    name: string;
  };
  location: {
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    region?: string;
    country?: string;
  };
  images?: Array<{
    url: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  rating?: number;
  reviewCount?: number;
  priceRange?: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH';
  openingHours?: Array<{
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
  website?: string;
  telephone?: string;
  accessibility?: {
    wheelchairAccessible?: boolean;
    features?: string[];
  };
}

const DEFAULT_SEO: SEOConfig = {
  title: 'DataTourisme - Découvrez la France Authentique',
  description: 'Explorez les trésors cachés de la France avec DataTourisme. Découvrez des expériences authentiques, des hébergements uniques et des activités inoubliables partout en France.',
  keywords: [
    'tourisme France',
    'voyage France',
    'activités touristiques',
    'hébergement France',
    'découverte France',
    'patrimoine français',
    'culture française',
    'gastronomie française',
  ],
};

export function generateMetadata(config: Partial<SEOConfig> = {}): Metadata {
  const seoConfig: SEOConfig = { ...DEFAULT_SEO, ...config };
  
  const metadata: Metadata = {
    title: seoConfig.title,
    description: seoConfig.description,
    keywords: seoConfig.keywords?.join(', '),
    robots: {
      index: !seoConfig.noindex,
      follow: !seoConfig.nofollow,
      googleBot: {
        index: !seoConfig.noindex,
        follow: !seoConfig.nofollow,
      },
    },
    openGraph: {
      title: seoConfig.title,
      description: seoConfig.description,
      url: seoConfig.canonical,
      siteName: 'DataTourisme',
      locale: 'fr_FR',
      type: 'website',
      images: seoConfig.ogImage ? [{
        url: seoConfig.ogImage.url,
        width: seoConfig.ogImage.width || 1200,
        height: seoConfig.ogImage.height || 630,
        alt: seoConfig.ogImage.alt || seoConfig.title,
      }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoConfig.title,
      description: seoConfig.description,
      images: seoConfig.ogImage ? [seoConfig.ogImage.url] : undefined,
    },
    alternates: {
      canonical: seoConfig.canonical,
      languages: {
        'fr': '/fr',
        'en': '/en',
        'de': '/de',
        'es': '/es',
        'it': '/it',
        'nl': '/nl',
      },
    },
  };

  if (seoConfig.canonical) {
    metadata.alternates = {
      ...metadata.alternates,
      canonical: seoConfig.canonical,
    };
  }

  return metadata;
}

export function generateTourismResourceStructuredData(resource: TourismResource): Record<string, any> {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    '@id': `https://datatourisme.fr/resources/${resource.id}`,
    name: resource.name,
    description: resource.description,
    url: `https://datatourisme.fr/resources/${resource.id}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: resource.location.name,
      addressCountry: resource.location.country || 'FR',
      ...(resource.location.address && { streetAddress: resource.location.address }),
      ...(resource.location.region && { addressRegion: resource.location.region }),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: resource.location.latitude,
      longitude: resource.location.longitude,
    },
    ...(resource.images && resource.images.length > 0 && {
      image: resource.images.map(img => ({
        '@type': 'ImageObject',
        url: img.url,
        name: img.alt,
        ...(img.width && { width: img.width }),
        ...(img.height && { height: img.height }),
      })),
    }),
    ...(resource.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: resource.rating,
        ratingCount: resource.reviewCount || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(resource.openingHours && {
      openingHoursSpecification: resource.openingHours.map(hours => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${hours.dayOfWeek}`,
        opens: hours.opens,
        closes: hours.closes,
      })),
    }),
    ...(resource.website && { url: resource.website }),
    ...(resource.telephone && { telephone: resource.telephone }),
    isAccessibleForFree: resource.priceRange === 'FREE',
  };

  // Add category-specific structured data
  switch (resource.category.id) {
    case 'accommodation':
      return {
        ...baseStructuredData,
        '@type': 'LodgingBusiness',
        amenityFeature: resource.accessibility?.features?.map(feature => ({
          '@type': 'LocationFeatureSpecification',
          name: feature,
        })) || [],
      };
    case 'restaurant':
      return {
        ...baseStructuredData,
        '@type': 'Restaurant',
        servesCuisine: 'French',
        priceRange: getPriceRangeSymbol(resource.priceRange),
      };
    case 'heritage':
      return {
        ...baseStructuredData,
        '@type': 'Museum',
        ...(resource.accessibility?.wheelchairAccessible !== undefined && {
          isAccessibleForFree: resource.accessibility.wheelchairAccessible,
        }),
      };
    case 'activity':
      return {
        ...baseStructuredData,
        '@type': 'TouristAttraction',
        touristType: 'Leisure',
      };
    default:
      return baseStructuredData;
  }
}

function getPriceRangeSymbol(priceRange?: string): string {
  switch (priceRange) {
    case 'FREE': return 'Free';
    case 'LOW': return '$';
    case 'MEDIUM': return '$$';
    case 'HIGH': return '$$$';
    default: return '$$';
  }
}

export function generateBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function generateLocalBusinessStructuredData(business: {
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  telephone: string;
  website: string;
  openingHours: Array<{ dayOfWeek: string; opens: string; closes: string }>;
}): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.region,
      postalCode: business.postalCode,
      addressCountry: business.country,
    },
    telephone: business.telephone,
    url: business.website,
    openingHoursSpecification: business.openingHours.map(hours => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${hours.dayOfWeek}`,
      opens: hours.opens,
      closes: hours.closes,
    })),
  };
}

export function generateWebsiteStructuredData(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DataTourisme',
    alternateName: 'DataTourisme France',
    url: 'https://datatourisme.fr',
    description: 'Plateforme officielle du tourisme en France - Découvrez des expériences authentiques',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://datatourisme.fr/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://www.facebook.com/datatourisme',
      'https://twitter.com/datatourisme',
      'https://www.instagram.com/datatourisme',
      'https://www.linkedin.com/company/datatourisme',
    ],
  };
}

export function generateOrganizationStructuredData(): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DataTourisme',
    url: 'https://datatourisme.fr',
    logo: 'https://datatourisme.fr/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+33-1-00-00-00-00',
      contactType: 'Customer Service',
      availableLanguage: ['French', 'English', 'German', 'Spanish', 'Italian', 'Dutch'],
    },
    sameAs: [
      'https://www.facebook.com/datatourisme',
      'https://twitter.com/datatourisme',
      'https://www.instagram.com/datatourisme',
      'https://www.linkedin.com/company/datatourisme',
    ],
  };
}

export function cleanText(text: string, maxLength?: number): string {
  let cleaned = text
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}

export function generateKeywords(resource: TourismResource): string[] {
  const keywords: string[] = [
    resource.name,
    resource.category.name,
    resource.location.name,
  ];

  if (resource.location.region) {
    keywords.push(resource.location.region);
  }

  // Add category-specific keywords
  switch (resource.category.id) {
    case 'accommodation':
      keywords.push('hébergement', 'séjour', 'nuitée');
      break;
    case 'restaurant':
      keywords.push('restaurant', 'gastronomie', 'cuisine française');
      break;
    case 'heritage':
      keywords.push('patrimoine', 'culture', 'histoire', 'visite');
      break;
    case 'activity':
      keywords.push('activité', 'loisir', 'découverte');
      break;
    case 'nature':
      keywords.push('nature', 'plein air', 'randonnée');
      break;
  }

  return Array.from(new Set(keywords)); // Remove duplicates
}