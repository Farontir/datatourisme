import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEOHead } from '../../../src/components/seo';
import {
  generateMetadata as generateSEOMetadata,
  generateTourismResourceStructuredData,
  generateBreadcrumbStructuredData,
  generateKeywords,
  cleanText,
  type TourismResource,
} from '../../../src/lib/seo';

interface ResourcePageProps {
  params: {
    id: string;
  };
}

// Mock function to fetch resource data - in real app this would come from API
async function getResource(id: string): Promise<TourismResource | null> {
  // Mock data for demonstration
  const mockResources: Record<string, TourismResource> = {
    'chateau-versailles': {
      id: 'chateau-versailles',
      name: 'Château de Versailles',
      description: 'Le château de Versailles est un château et un ensemble monumental français du XVIIe siècle, situé à Versailles dans les Yvelines. Il fut la résidence des rois de France Louis XIV, Louis XV et Louis XVI.',
      category: {
        id: 'heritage',
        name: 'Patrimoine',
      },
      location: {
        name: 'Versailles',
        address: 'Place d\'Armes, 78000 Versailles',
        latitude: 48.8049,
        longitude: 2.1204,
        region: 'Île-de-France',
        country: 'FR',
      },
      images: [
        {
          url: '/images/versailles-1.jpg',
          alt: 'Château de Versailles façade',
          width: 1200,
          height: 800,
        },
      ],
      rating: 4.5,
      reviewCount: 25000,
      priceRange: 'MEDIUM',
      openingHours: [
        { dayOfWeek: 'Tuesday', opens: '09:00', closes: '18:30' },
        { dayOfWeek: 'Wednesday', opens: '09:00', closes: '18:30' },
        { dayOfWeek: 'Thursday', opens: '09:00', closes: '18:30' },
        { dayOfWeek: 'Friday', opens: '09:00', closes: '18:30' },
        { dayOfWeek: 'Saturday', opens: '09:00', closes: '18:30' },
        { dayOfWeek: 'Sunday', opens: '09:00', closes: '18:30' },
      ],
      website: 'https://www.chateauversailles.fr',
      telephone: '+33 1 30 83 78 00',
      accessibility: {
        wheelchairAccessible: true,
        features: ['Rampe d\'accès', 'Ascenseur', 'Toilettes accessibles'],
      },
    },
  };

  return mockResources[id] || null;
}

export async function generateMetadata({ params }: ResourcePageProps): Promise<Metadata> {
  const resource = await getResource(params.id);
  
  if (!resource) {
    return {
      title: 'Ressource non trouvée',
      description: 'La ressource demandée n\'a pas été trouvée.',
    };
  }

  const keywords = generateKeywords(resource);
  const cleanDescription = cleanText(resource.description, 160);
  
  return generateSEOMetadata({
    title: `${resource.name} - ${resource.location.name}`,
    description: cleanDescription,
    keywords,
    canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/resources/${resource.id}`,
    ogImage: resource.images?.[0] ? {
      url: resource.images[0].url,
      width: resource.images[0].width,
      height: resource.images[0].height,
      alt: resource.images[0].alt,
    } : undefined,
  });
}

export default async function ResourcePage({ params }: ResourcePageProps) {
  const resource = await getResource(params.id);
  
  if (!resource) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Ressources', url: '/resources' },
    { name: resource.category.name, url: `/resources?category=${resource.category.id}` },
    { name: resource.name, url: `/resources/${resource.id}` },
  ];

  const structuredData = [
    generateTourismResourceStructuredData(resource),
    generateBreadcrumbStructuredData(breadcrumbs),
  ];

  return (
    <>
      <SEOHead structuredData={structuredData} includeDefaults={false} />
      
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-6">
          <ol className="flex space-x-2 text-sm text-gray-600">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                <a href={crumb.url} className="hover:text-blue-600">
                  {crumb.name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            {resource.images?.[0] && (
              <img
                src={resource.images[0].url}
                alt={resource.images[0].alt}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold mb-4">{resource.name}</h1>
            <p className="text-gray-600 mb-4">{resource.description}</p>
            
            <div className="space-y-2">
              <p><strong>Catégorie:</strong> {resource.category.name}</p>
              <p><strong>Lieu:</strong> {resource.location.name}</p>
              {resource.location.address && (
                <p><strong>Adresse:</strong> {resource.location.address}</p>
              )}
              {resource.rating && (
                <p><strong>Note:</strong> {resource.rating}/5 ({resource.reviewCount} avis)</p>
              )}
              {resource.website && (
                <p><strong>Site web:</strong> <a href={resource.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{resource.website}</a></p>
              )}
              {resource.telephone && (
                <p><strong>Téléphone:</strong> {resource.telephone}</p>
              )}
            </div>

            {resource.openingHours && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Horaires d'ouverture</h3>
                <ul className="space-y-1">
                  {resource.openingHours.map((hours, index) => (
                    <li key={index} className="text-sm">
                      <strong>{hours.dayOfWeek}:</strong> {hours.opens} - {hours.closes}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resource.accessibility && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Accessibilité</h3>
                <p className="text-sm">
                  {resource.accessibility.wheelchairAccessible ? 'Accessible aux personnes à mobilité réduite' : 'Non accessible aux personnes à mobilité réduite'}
                </p>
                {resource.accessibility.features && (
                  <ul className="mt-2 space-y-1">
                    {resource.accessibility.features.map((feature, index) => (
                      <li key={index} className="text-sm">• {feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}