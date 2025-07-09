import Link from 'next/link';
import { MapPin, Star, Heart, Accessibility } from 'lucide-react';

import { Card, CardContent, Badge, Button } from '@datatourisme/ui';
import { useSearchStore } from '../../stores/search-store';

interface SearchResultListProps {
  resource: {
    id: string;
    name: string;
    description: string;
    location: {
      name: string;
      latitude: number;
      longitude: number;
    };
    category: {
      id: string;
      name: string;
    };
    rating: number;
    reviewCount: number;
    priceRange: string;
    images: Array<{
      id: string;
      url: string;
      alt: string;
      width: number;
      height: number;
    }>;
    accessibility?: {
      wheelchairAccessible: boolean;
    };
  };
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

export function SearchResultList({ resource }: SearchResultListProps) {
  const { toggleFavorite, isFavorite } = useSearchStore();
  const isResourceFavorite = isFavorite(resource.id);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(resource.id);
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative h-48 sm:h-32 sm:w-48 flex-shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
            
            {/* Favorite Button */}
            <div className="absolute top-2 right-2 z-20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-3 w-3 ${isResourceFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </Button>
            </div>

            {/* Placeholder for image */}
            <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 group-hover:scale-105 transition-transform duration-300" />
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {resource.category.name}
                  </Badge>
                  <Badge className={priceRangeColors[resource.priceRange as keyof typeof priceRangeColors]}>
                    {priceRangeLabels[resource.priceRange as keyof typeof priceRangeLabels]}
                  </Badge>
                  {resource.accessibility?.wheelchairAccessible && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      <Accessibility className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {resource.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-neutral-500">
                    ({resource.reviewCount.toLocaleString('fr-FR')})
                  </span>
                </div>
              </div>

              {/* Title and description */}
              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1 mb-2">
                {resource.name}
              </h3>
              
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 flex-1">
                {resource.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">{resource.location.name}</span>
                </div>
                
                <Link href={`/resources/${resource.id}`}>
                  <Button variant="outline" size="sm">
                    Voir les détails
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}