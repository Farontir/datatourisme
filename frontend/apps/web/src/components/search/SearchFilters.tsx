'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Mountain, 
  UtensilsCrossed, 
  Camera, 
  TreePine, 
  Waves, 
  Building2, 
  Star,
  Euro,
  Accessibility
} from 'lucide-react';
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Badge,
  Separator
} from '@datatourisme/ui';

const categories = [
  { id: 'mountains', name: 'Montagnes', icon: Mountain },
  { id: 'restaurants', name: 'Gastronomie', icon: UtensilsCrossed },
  { id: 'monuments', name: 'Monuments', icon: Camera },
  { id: 'nature', name: 'Nature', icon: TreePine },
  { id: 'beaches', name: 'Plages', icon: Waves },
  { id: 'cities', name: 'Villes', icon: Building2 },
];

const priceRanges = [
  { value: 'FREE', label: 'Gratuit' },
  { value: 'LOW', label: '€ (Économique)' },
  { value: 'MEDIUM', label: '€€ (Modéré)' },
  { value: 'HIGH', label: '€€€ (Premium)' },
];

const ratings = [
  { value: '4', label: '4+ étoiles' },
  { value: '3', label: '3+ étoiles' },
  { value: '2', label: '2+ étoiles' },
];

const sortOptions = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'name', label: 'Nom (A-Z)' },
  { value: 'rating', label: 'Note' },
  { value: 'distance', label: 'Distance' },
];

interface SearchFiltersProps {
  searchParams?: {
    q?: string;
    category?: string;
    location?: string;
    priceRange?: string;
    rating?: string;
    sort?: string;
  };
}

export function SearchFilters({ searchParams }: SearchFiltersProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();
  
  // URL state management with nuqs
  const [category, setCategory] = useQueryState('category', parseAsString);
  const [priceRange, setPriceRange] = useQueryState('priceRange', parseAsString);
  const [rating, setRating] = useQueryState('rating', parseAsString);
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('relevance'));
  const [accessibility, setAccessibility] = useQueryState('accessibility', parseAsString);

  const activeFiltersCount = [category, priceRange, rating, accessibility].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategory(null);
    setPriceRange(null);
    setRating(null);
    setAccessibility(null);
  };

  const toggleCategory = (categoryId: string) => {
    setCategory(category === categoryId ? null : categoryId);
  };

  const toggleAccessibility = () => {
    setAccessibility(accessibility ? null : 'true');
  };

  return (
    <div className="space-y-6">
      {/* Active Filters & Clear */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="outline">
            {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
          </Badge>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Tout effacer
          </Button>
        </div>
      )}

      {/* Sort */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Trier par</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={sort || 'relevance'} onValueChange={setSort}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Catégories</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.name}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <Euro className="inline h-4 w-4 mr-1" />
            Gamme de prix
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={priceRange || ''} onValueChange={setPriceRange}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les gammes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les gammes</SelectItem>
              {priceRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <Star className="inline h-4 w-4 mr-1" />
            Note minimum
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={rating || ''} onValueChange={setRating}>
            <SelectTrigger>
              <SelectValue placeholder="Toutes les notes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les notes</SelectItem>
              {ratings.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <Accessibility className="inline h-4 w-4 mr-1" />
            Accessibilité
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <button
            onClick={toggleAccessibility}
            className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
              accessibility
                ? 'bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Accessible aux fauteuils roulants</span>
            <div className={`w-4 h-4 rounded border-2 ${
              accessibility 
                ? 'bg-primary-600 border-primary-600' 
                : 'border-neutral-300 dark:border-neutral-600'
            }`}>
              {accessibility && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-sm" />
                </div>
              )}
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
}