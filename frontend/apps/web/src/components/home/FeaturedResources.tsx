import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, Badge, Button, MapPin, Star, Heart } from '@datatourisme/ui';

// This would normally fetch from your API
async function getFeaturedResources() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return [
    {
      id: '1',
      name: 'Château de Versailles',
      description: 'Visitez le somptueux château royal et ses jardins à la française.',
      location: {
        name: 'Versailles, Yvelines',
      },
      category: 'Patrimoine',
      rating: 4.8,
      reviewCount: 15647,
      priceRange: 'MEDIUM',
      image: '/placeholder-chateau.jpg',
    },
    {
      id: '2',
      name: 'Mont-Blanc',
      description: 'Le plus haut sommet d\'Europe occidentale, paradis des randonneurs.',
      location: {
        name: 'Chamonix, Haute-Savoie',
      },
      category: 'Montagne',
      rating: 4.9,
      reviewCount: 8923,
      priceRange: 'FREE',
      image: '/placeholder-mountain.jpg',
    },
    {
      id: '3',
      name: 'Musée du Louvre',
      description: 'Le plus grand musée du monde et ses œuvres incontournables.',
      location: {
        name: 'Paris, Île-de-France',
      },
      category: 'Culture',
      rating: 4.7,
      reviewCount: 23456,
      priceRange: 'MEDIUM',
      image: '/placeholder-museum.jpg',
    },
    {
      id: '4',
      name: 'Plages de Saint-Tropez',
      description: 'Détendez-vous sur les plages mythiques de la Côte d\'Azur.',
      location: {
        name: 'Saint-Tropez, Var',
      },
      category: 'Plage',
      rating: 4.6,
      reviewCount: 5678,
      priceRange: 'HIGH',
      image: '/placeholder-beach.jpg',
    },
    {
      id: '5',
      name: 'Lavandes de Provence',
      description: 'Découvrez les champs de lavande aux couleurs et parfums envoûtants.',
      location: {
        name: 'Valensole, Alpes-de-Haute-Provence',
      },
      category: 'Nature',
      rating: 4.5,
      reviewCount: 3421,
      priceRange: 'FREE',
      image: '/placeholder-lavender.jpg',
    },
    {
      id: '6',
      name: 'Vignobles de Bordeaux',
      description: 'Dégustez les vins prestigieux dans les châteaux bordelais.',
      location: {
        name: 'Bordeaux, Gironde',
      },
      category: 'Gastronomie',
      rating: 4.7,
      reviewCount: 7890,
      priceRange: 'HIGH',
      image: '/placeholder-vineyard.jpg',
    },
  ];
}

const priceRangeLabels = {
  FREE: 'Gratuit',
  LOW: '€',
  MEDIUM: '€€',
  HIGH: '€€€',
};

const priceRangeColors = {
  FREE: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  HIGH: 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300',
};

export async function FeaturedResources() {
  const resources = await getFeaturedResources();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <Card key={resource.id} className="group overflow-hidden transition-all hover:shadow-lg">
          <div className="relative h-48 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <div className="absolute top-3 right-3 z-20">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30">
                <Heart className="h-4 w-4 text-white" />
              </Button>
            </div>
            <div className="absolute bottom-3 left-3 z-20">
              <Badge className={priceRangeColors[resource.priceRange as keyof typeof priceRangeColors]}>
                {priceRangeLabels[resource.priceRange as keyof typeof priceRangeLabels]}
              </Badge>
            </div>
            {/* Placeholder for image - in real app you'd use the actual image */}
            <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800" />
          </div>
          
          <CardContent className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <Badge variant="secondary" className="text-xs">
                {resource.category}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {resource.rating}
                </span>
                <span className="text-xs text-neutral-500">
                  ({resource.reviewCount.toLocaleString('fr-FR')})
                </span>
              </div>
            </div>
            
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {resource.name}
            </h3>
            
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {resource.description}
            </p>
            
            <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="h-3 w-3" />
              {resource.location.name}
            </div>
            
            <div className="mt-4">
              <Link href={`/resources/${resource.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  Découvrir
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}