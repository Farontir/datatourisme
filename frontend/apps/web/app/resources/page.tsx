import { Metadata } from 'next';
import Link from 'next/link';
import { SEOHead } from '../../src/components/seo';
import {
  generateMetadata as generateSEOMetadata,
  generateBreadcrumbStructuredData,
  type TourismResource,
} from '../../src/lib/seo';

interface ResourcesPageProps {
  searchParams: {
    category?: string;
    search?: string;
  };
}

// Mock function to fetch resources - in real app this would come from API
async function getResources(filters: { category?: string; search?: string }): Promise<TourismResource[]> {
  // Mock data for demonstration
  const mockResources: TourismResource[] = [
    {
      id: 'chateau-versailles',
      name: 'Château de Versailles',
      description: 'Le château de Versailles est un château et un ensemble monumental français du XVIIe siècle.',
      category: { id: 'heritage', name: 'Patrimoine' },
      location: {
        name: 'Versailles',
        address: 'Place d\'Armes, 78000 Versailles',
        latitude: 48.8049,
        longitude: 2.1204,
        region: 'Île-de-France',
        country: 'FR',
      },
      images: [{ url: '/images/versailles-1.jpg', alt: 'Château de Versailles' }],
      rating: 4.5,
      reviewCount: 25000,
      priceRange: 'MEDIUM',
    },
    {
      id: 'tour-eiffel',
      name: 'Tour Eiffel',
      description: 'La tour Eiffel est une tour de fer puddlé de 324 mètres de hauteur située à Paris.',
      category: { id: 'heritage', name: 'Patrimoine' },
      location: {
        name: 'Paris',
        address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
        latitude: 48.8584,
        longitude: 2.2945,
        region: 'Île-de-France',
        country: 'FR',
      },
      images: [{ url: '/images/tour-eiffel.jpg', alt: 'Tour Eiffel' }],
      rating: 4.2,
      reviewCount: 150000,
      priceRange: 'MEDIUM',
    },
  ];

  // Apply filters (simplified for demo)
  let filtered = mockResources;
  
  if (filters.category) {
    filtered = filtered.filter(r => r.category.id === filters.category);
  }
  
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(r => 
      r.name.toLowerCase().includes(searchTerm) ||
      r.description.toLowerCase().includes(searchTerm) ||
      r.location.name.toLowerCase().includes(searchTerm)
    );
  }
  
  return filtered;
}

export async function generateMetadata({ searchParams }: ResourcesPageProps): Promise<Metadata> {
  const { category, search } = searchParams;
  
  let title = 'Ressources Touristiques';
  let description = 'Découvrez notre collection de ressources touristiques en France. Explorez des châteaux, musées, restaurants et activités authentiques.';
  
  if (category) {
    const categoryNames: Record<string, string> = {
      heritage: 'Patrimoine',
      accommodation: 'Hébergement',
      restaurant: 'Restaurants',
      activity: 'Activités',
      nature: 'Nature',
    };
    title = `${categoryNames[category] || 'Ressources'} - DataTourisme`;
    description = `Découvrez notre sélection de ${categoryNames[category]?.toLowerCase() || 'ressources'} en France.`;
  }
  
  if (search) {
    title = `Recherche: ${search} - DataTourisme`;
    description = `Résultats de recherche pour "${search}" dans nos ressources touristiques.`;
  }

  return generateSEOMetadata({
    title,
    description,
    canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/resources`,
    keywords: ['ressources touristiques', 'France', 'patrimoine', 'activités', 'hébergement'],
  });
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const resources = await getResources(searchParams);
  const { category, search } = searchParams;
  
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Ressources', url: '/resources' },
  ];
  
  if (category) {
    const categoryNames: Record<string, string> = {
      heritage: 'Patrimoine',
      accommodation: 'Hébergement', 
      restaurant: 'Restaurants',
      activity: 'Activités',
      nature: 'Nature',
    };
    breadcrumbs.push({
      name: categoryNames[category] || 'Catégorie',
      url: `/resources?category=${category}`,
    });
  }

  const structuredData = [
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {category ? `Ressources - ${breadcrumbs[breadcrumbs.length - 1]?.name}` : 'Ressources Touristiques'}
          </h1>
          {search && (
            <p className="text-gray-600 mb-4">
              Résultats de recherche pour "<strong>{search}</strong>" ({resources.length} résultat{resources.length > 1 ? 's' : ''})
            </p>
          )}
        </div>

        {/* Category filters */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Filtrer par catégorie</h2>
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/resources" 
              className={`px-4 py-2 rounded-lg ${!category ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              Toutes
            </Link>
            {[
              { id: 'heritage', name: 'Patrimoine' },
              { id: 'accommodation', name: 'Hébergement' },
              { id: 'restaurant', name: 'Restaurants' },
              { id: 'activity', name: 'Activités' },
              { id: 'nature', name: 'Nature' },
            ].map((cat) => (
              <Link
                key={cat.id}
                href={`/resources?category=${cat.id}`}
                className={`px-4 py-2 rounded-lg ${category === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Resources grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <Link key={resource.id} href={`/resources/${resource.id}`}>
              <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {resource.images?.[0] && (
                  <img
                    src={resource.images[0].url}
                    alt={resource.images[0].alt}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{resource.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{resource.location.name}</p>
                  <p className="text-gray-700 text-sm line-clamp-3">{resource.description}</p>
                  {resource.rating && (
                    <div className="mt-3 flex items-center">
                      <span className="text-yellow-500">★</span>
                      <span className="ml-1 text-sm text-gray-600">
                        {resource.rating} ({resource.reviewCount} avis)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {resources.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucune ressource trouvée.</p>
            <Link href="/resources" className="text-blue-600 hover:underline mt-2 inline-block">
              Voir toutes les ressources
            </Link>
          </div>
        )}
      </div>
    </>
  );
}