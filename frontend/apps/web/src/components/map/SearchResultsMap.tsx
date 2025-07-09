'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Star } from '@datatourisme/ui';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface SearchResultsMapProps {
  results: Array<{
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
  }>;
  onMarkerClick?: (resourceId: string) => void;
  className?: string;
}

const priceRangeLabels = {
  FREE: 'Gratuit',
  LOW: '€',
  MEDIUM: '€€',
  HIGH: '€€€',
};

export function SearchResultsMap({ results, onMarkerClick, className }: SearchResultsMapProps) {
  const [isClient, setIsClient] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Calculate map center and bounds
  const getMapBounds = () => {
    if (results.length === 0) {
      return { center: [46.603354, 1.888334], zoom: 6 }; // Center of France
    }

    const latitudes = results.map(r => r.location.latitude);
    const longitudes = results.map(r => r.location.longitude);

    const centerLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
    const centerLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;

    return { center: [centerLat, centerLng], zoom: 10 };
  };

  const { center, zoom } = getMapBounds();

  if (!isClient) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`h-full w-full rounded-lg overflow-hidden ${className}`}>
      {typeof window !== 'undefined' && (
        <MapContainer
          center={center as [number, number]}
          zoom={zoom}
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {results.map((result) => (
            <Marker
              key={result.id}
              position={[result.location.latitude, result.location.longitude]}
              eventHandlers={{
                click: () => onMarkerClick?.(result.id),
              }}
            >
              <Popup>
                <div className="p-2 max-w-xs">
                  <h3 className="font-semibold text-sm mb-1">{result.name}</h3>
                  <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
                    {result.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{result.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-neutral-500">
                      {priceRangeLabels[result.priceRange as keyof typeof priceRangeLabels]}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                    <MapPin className="h-3 w-3" />
                    <span className="line-clamp-1">{result.location.name}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}