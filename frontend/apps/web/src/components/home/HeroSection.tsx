'use client';

import Link from 'next/link';
import { Button, ArrowRight, MapPin, Search } from '@datatourisme/ui';
import { SearchBar } from '../search/SearchBar';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-6 py-12 text-white sm:px-8 lg:px-12 lg:py-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Découvrez la France
          <span className="block text-primary-200">autrement</span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-primary-100 sm:text-xl">
          Explorez des milliers de destinations, activités et expériences uniques 
          à travers toute la France avec notre plateforme de données touristiques.
        </p>

        {/* Search Bar */}
        <div className="mt-8 mx-auto max-w-lg">
          <SearchBar 
            className="bg-white"
            placeholder="Où souhaitez-vous aller ?"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/search">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              <Search className="mr-2 h-5 w-5" />
              Explorer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <Link href="/map">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary-600"
            >
              <MapPin className="mr-2 h-5 w-5" />
              Voir la carte
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">10k+</div>
            <div className="text-sm text-primary-200">Destinations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">500+</div>
            <div className="text-sm text-primary-200">Villes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">50+</div>
            <div className="text-sm text-primary-200">Catégories</div>
          </div>
        </div>
      </div>
    </section>
  );
}