import { Suspense } from 'react';
import Link from 'next/link';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@datatourisme/ui';
import { FeaturedResources } from '../src/components/home/FeaturedResources';
import { PopularCategories } from '../src/components/home/PopularCategories';
import { StatsCards } from '../src/components/home/StatsCards';
import { HeroSection } from '../src/components/home/HeroSection';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-neutral-100 rounded-lg" />}>
        <StatsCards />
      </Suspense>

      {/* Popular Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Catégories populaires
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Découvrez les activités les plus recherchées
            </p>
          </div>
          <Link href="/categories">
            <Button variant="outline">Voir tout</Button>
          </Link>
        </div>
        <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse bg-neutral-100 rounded-lg" />
          ))}
        </div>}>
          <PopularCategories />
        </Suspense>
      </section>

      {/* Featured Resources */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Ressources en vedette
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Nos recommendations pour votre prochaine aventure
            </p>
          </div>
          <Link href="/search">
            <Button variant="outline">Explorer plus</Button>
          </Link>
        </div>
        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-neutral-100 rounded-lg" />
          ))}
        </div>}>
          <FeaturedResources />
        </Suspense>
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-8 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">
          Prêt à explorer ?
        </h2>
        <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
          Découvrez des milliers de destinations et d'activités touristiques partout en France
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/search">
            <Button size="lg" variant="secondary">
              Commencer la recherche
            </Button>
          </Link>
          <Link href="/map">
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary-600">
              Explorer la carte
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}