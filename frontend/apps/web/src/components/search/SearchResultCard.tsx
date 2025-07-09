import Link from 'next/link';
import { MapPin, Star, Heart, Accessibility } from 'lucide-react';

import { Card, CardContent, Badge, Button } from '@datatourisme/ui';
import { useSearchStore } from '../../stores/search-store';

interface SearchResultCardProps {
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

export function SearchResultCard({ resource }: SearchResultCardProps) {
  const { toggleFavorite, isFavorite } = useSearchStore();
  const isResourceFavorite = isFavorite(resource.id);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(resource.id);
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        
        {/* Favorite Button */}
        <div className="absolute top-3 right-3 z-20">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={handleToggleFavorite}
          >
            <Heart className={`h-4 w-4 ${isResourceFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </Button>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 z-20">
          <Badge className={priceRangeColors[resource.priceRange as keyof typeof priceRangeColors]}>
            {priceRangeLabels[resource.priceRange as keyof typeof priceRangeLabels]}
          </Badge>
        </div>

        {/* Accessibility Badge */}
        {resource.accessibility?.wheelchairAccessible && (
          <div className="absolute bottom-3 right-3 z-20">
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              <Accessibility className="h-3 w-3" />
            </Badge>
          </div>
        )}

        {/* Placeholder for image */}
        <div className="h-full w-full bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800 group-hover:scale-105 transition-transform duration-300" />
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <Badge variant="secondary" className="text-xs">
            {resource.category.name}
          </Badge>
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
        
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
          {resource.name}
        </h3>
        
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
          {resource.description}
        </p>
        
        <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">{resource.location.name}</span>
        </div>
        
        <div className="mt-4">
          <Link href={`/resources/${resource.id}`}>
            <Button variant="outline" size="sm" className="w-full">
              Voir les détails
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}