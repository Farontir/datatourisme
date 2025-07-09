import { useState, useCallback, useEffect, useRef } from 'react';
import { MapMarker, MapBounds, MapTileLayer } from '../components/Map';

export interface UseMapOptions {
  /** Initial map center */
  initialCenter?: [number, number];
  /** Initial zoom level */
  initialZoom?: number;
  /** Initial markers */
  initialMarkers?: MapMarker[];
  /** Enable automatic bounds fitting */
  autoFitBounds?: boolean;
  /** Enable geolocation */
  enableGeolocation?: boolean;
  /** Enable offline storage */
  enableOfflineStorage?: boolean;
  /** Storage key for offline data */
  storageKey?: string;
}

export interface UseMapReturn {
  // Map state
  center: [number, number];
  zoom: number;
  bounds: MapBounds | null;
  markers: MapMarker[];
  isLoading: boolean;
  
  // Geolocation
  userLocation: [number, number] | null;
  isLocating: boolean;
  locationError: string | null;
  
  // Offline capabilities
  isOfflineMode: boolean;
  offlineRegions: OfflineRegion[];
  
  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: MapBounds) => void;
  addMarker: (marker: MapMarker) => void;
  removeMarker: (markerId: string) => void;
  updateMarker: (markerId: string, updates: Partial<MapMarker>) => void;
  clearMarkers: () => void;
  
  // Geolocation actions
  getCurrentLocation: () => Promise<[number, number] | null>;
  watchLocation: () => () => void; // Returns cleanup function
  
  // Bounds and utility actions
  fitBounds: (markers?: MapMarker[]) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  
  // Offline actions
  toggleOfflineMode: () => void;
  downloadRegion: (bounds: MapBounds, name: string) => Promise<void>;
  deleteOfflineRegion: (regionId: string) => void;
  
  // Search and filtering
  searchMarkers: (query: string) => MapMarker[];
  filterMarkers: (predicate: (marker: MapMarker) => boolean) => MapMarker[];
  getMarkersInBounds: (bounds: MapBounds) => MapMarker[];
}

interface OfflineRegion {
  id: string;
  name: string;
  bounds: MapBounds;
  downloadDate: Date;
  size: number; // in MB
}

export function useMap({
  initialCenter = [46.603354, 1.888334],
  initialZoom = 6,
  initialMarkers = [],
  autoFitBounds = false,
  enableGeolocation = false,
  enableOfflineStorage = false,
  storageKey = 'map-offline-data',
}: UseMapOptions = {}): UseMapReturn {
  
  // Core map state
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>(initialMarkers);
  const [isLoading, setIsLoading] = useState(false);
  
  // Geolocation state
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  // Offline state
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineRegions, setOfflineRegions] = useState<OfflineRegion[]>([]);
  
  // Load offline data on mount
  useEffect(() => {
    if (enableOfflineStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          setOfflineRegions(data.regions || []);
          setIsOfflineMode(data.isOfflineMode || false);
        }
      } catch (error) {
        console.error('Failed to load offline data:', error);
      }
    }
  }, [enableOfflineStorage, storageKey]);
  
  // Save offline data when it changes
  useEffect(() => {
    if (enableOfflineStorage && typeof window !== 'undefined') {
      try {
        const data = {
          regions: offlineRegions,
          isOfflineMode,
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save offline data:', error);
      }
    }
  }, [offlineRegions, isOfflineMode, enableOfflineStorage, storageKey]);
  
  // Auto-fit bounds when markers change
  useEffect(() => {
    if (autoFitBounds && markers.length > 0) {
      fitBounds(markers);
    }
  }, [markers, autoFitBounds]);
  
  // Marker management
  const addMarker = useCallback((marker: MapMarker) => {
    setMarkers(prev => [...prev, marker]);
  }, []);
  
  const removeMarker = useCallback((markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId));
  }, []);
  
  const updateMarker = useCallback((markerId: string, updates: Partial<MapMarker>) => {
    setMarkers(prev => prev.map(marker => 
      marker.id === markerId ? { ...marker, ...updates } : marker
    ));
  }, []);
  
  const clearMarkers = useCallback(() => {
    setMarkers([]);
  }, []);
  
  // Geolocation functions
  const getCurrentLocation = useCallback((): Promise<[number, number] | null> => {
    if (!enableGeolocation || !navigator.geolocation) {
      return Promise.resolve(null);
    }
    
    setIsLocating(true);
    setLocationError(null);
    
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(location);
          setIsLocating(false);
          resolve(location);
        },
        (error) => {
          setLocationError(error.message);
          setIsLocating(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, [enableGeolocation]);
  
  const watchLocation = useCallback(() => {
    if (!enableGeolocation || !navigator.geolocation) {
      return () => {};
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(location);
        setLocationError(null);
      },
      (error) => {
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
    
    watchIdRef.current = watchId;
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enableGeolocation]);
  
  // Bounds and navigation
  const fitBounds = useCallback((markersToFit = markers) => {
    if (markersToFit.length === 0) return;
    
    const latitudes = markersToFit.map(m => m.position[0]);
    const longitudes = markersToFit.map(m => m.position[1]);
    
    const bounds: MapBounds = {
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      west: Math.min(...longitudes),
    };
    
    // Calculate center and zoom
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    
    // Simple zoom calculation based on bounds size
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let newZoom = 10;
    if (maxDiff < 0.01) newZoom = 16;
    else if (maxDiff < 0.1) newZoom = 13;
    else if (maxDiff < 1) newZoom = 10;
    else if (maxDiff < 5) newZoom = 7;
    else newZoom = 5;
    
    setCenter([centerLat, centerLng]);
    setZoom(newZoom);
    setBounds(bounds);
  }, [markers]);
  
  const flyTo = useCallback((newCenter: [number, number], newZoom?: number) => {
    setCenter(newCenter);
    if (newZoom !== undefined) {
      setZoom(newZoom);
    }
  }, []);
  
  // Offline functionality
  const toggleOfflineMode = useCallback(() => {
    setIsOfflineMode(prev => !prev);
  }, []);
  
  const downloadRegion = useCallback(async (regionBounds: MapBounds, name: string) => {
    if (!enableOfflineStorage) return;
    
    setIsLoading(true);
    
    try {
      // Simulate downloading tiles for the region
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newRegion: OfflineRegion = {
        id: `region-${Date.now()}`,
        name,
        bounds: regionBounds,
        downloadDate: new Date(),
        size: Math.random() * 50 + 10, // Simulated size
      };
      
      setOfflineRegions(prev => [...prev, newRegion]);
    } catch (error) {
      console.error('Failed to download region:', error);
    } finally {
      setIsLoading(false);
    }
  }, [enableOfflineStorage]);
  
  const deleteOfflineRegion = useCallback((regionId: string) => {
    setOfflineRegions(prev => prev.filter(region => region.id !== regionId));
  }, []);
  
  // Search and filtering
  const searchMarkers = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return markers.filter(marker =>
      marker.title.toLowerCase().includes(lowerQuery) ||
      marker.description?.toLowerCase().includes(lowerQuery) ||
      marker.category?.toLowerCase().includes(lowerQuery)
    );
  }, [markers]);
  
  const filterMarkers = useCallback((predicate: (marker: MapMarker) => boolean) => {
    return markers.filter(predicate);
  }, [markers]);
  
  const getMarkersInBounds = useCallback((targetBounds: MapBounds) => {
    return markers.filter(marker => {
      const [lat, lng] = marker.position;
      return lat >= targetBounds.south &&
             lat <= targetBounds.north &&
             lng >= targetBounds.west &&
             lng <= targetBounds.east;
    });
  }, [markers]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);
  
  return {
    // State
    center,
    zoom,
    bounds,
    markers,
    isLoading,
    userLocation,
    isLocating,
    locationError,
    isOfflineMode,
    offlineRegions,
    
    // Actions
    setCenter,
    setZoom,
    setBounds,
    addMarker,
    removeMarker,
    updateMarker,
    clearMarkers,
    getCurrentLocation,
    watchLocation,
    fitBounds,
    flyTo,
    toggleOfflineMode,
    downloadRegion,
    deleteOfflineRegion,
    searchMarkers,
    filterMarkers,
    getMarkersInBounds,
  };
}