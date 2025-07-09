import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Navigation, 
  Download,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card, CardContent } from './Card';

// Types
export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  category?: string;
  icon?: React.ReactNode;
  data?: any;
}

export interface MapCluster {
  id: string;
  position: [number, number];
  count: number;
  markers: MapMarker[];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapTileLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  offline?: boolean;
}

// Map Component Props
interface MapProps {
  /** Map center coordinates [lat, lng] */
  center?: [number, number];
  /** Map zoom level */
  zoom?: number;
  /** Map markers */
  markers?: MapMarker[];
  /** Enable marker clustering */
  enableClustering?: boolean;
  /** Maximum cluster radius */
  clusterRadius?: number;
  /** Available tile layers */
  tileLayers?: MapTileLayer[];
  /** Default tile layer ID */
  defaultTileLayer?: string;
  /** Enable offline mode */
  enableOffline?: boolean;
  /** Map height */
  height?: string;
  /** Map width */
  width?: string;
  /** Custom CSS classes */
  className?: string;
  /** Marker click handler */
  onMarkerClick?: (marker: MapMarker) => void;
  /** Cluster click handler */
  onClusterClick?: (cluster: MapCluster) => void;
  /** Map bounds change handler */
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Map zoom change handler */
  onZoomChange?: (zoom: number) => void;
  /** Enable map controls */
  showControls?: boolean;
  /** Enable layer switcher */
  showLayerSwitcher?: boolean;
  /** Enable geolocation */
  enableGeolocation?: boolean;
  /** Custom map style */
  style?: React.CSSProperties;
}

// Default tile layers
const defaultTileLayers: MapTileLayer[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    maxZoom: 17,
  },
  {
    id: 'terrain',
    name: 'Terrain',
    url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design, © OpenStreetMap contributors',
    maxZoom: 16,
  },
];

// Map variants
const mapVariants = cva(
  'relative overflow-hidden bg-neutral-100 dark:bg-neutral-800',
  {
    variants: {
      variant: {
        default: 'rounded-lg border border-neutral-200 dark:border-neutral-800',
        fullscreen: 'rounded-none border-none',
        embedded: 'rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Clustering utility functions
function createClusters(markers: MapMarker[], zoom: number, radius: number = 80): (MapMarker | MapCluster)[] {
  if (!markers.length) return [];

  const clusters: MapCluster[] = [];
  const processedMarkers = new Set<string>();

  markers.forEach((marker) => {
    if (processedMarkers.has(marker.id)) return;

    const nearbyMarkers = markers.filter((otherMarker) => {
      if (processedMarkers.has(otherMarker.id) || marker.id === otherMarker.id) return false;
      
      const distance = getDistance(marker.position, otherMarker.position);
      return distance <= radius / Math.pow(2, zoom - 10); // Adjust cluster radius based on zoom
    });

    if (nearbyMarkers.length > 0) {
      // Create cluster
      const allMarkers = [marker, ...nearbyMarkers];
      const centerLat = allMarkers.reduce((sum, m) => sum + m.position[0], 0) / allMarkers.length;
      const centerLng = allMarkers.reduce((sum, m) => sum + m.position[1], 0) / allMarkers.length;

      clusters.push({
        id: `cluster-${marker.id}`,
        position: [centerLat, centerLng],
        count: allMarkers.length,
        markers: allMarkers,
      });

      allMarkers.forEach(m => processedMarkers.add(m.id));
    } else {
      // Single marker
      processedMarkers.add(marker.id);
    }
  });

  // Add remaining individual markers
  const individualMarkers = markers.filter(marker => !processedMarkers.has(marker.id));
  
  return [...clusters, ...individualMarkers];
}

function getDistance(pos1: [number, number], pos2: [number, number]): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = pos1[0] * Math.PI / 180;
  const φ2 = pos2[0] * Math.PI / 180;
  const Δφ = (pos2[0] - pos1[0]) * Math.PI / 180;
  const Δλ = (pos2[1] - pos1[1]) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Map Controls Component
interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleLayers?: () => void;
  onToggleGeolocation?: () => void;
  onDownloadOffline?: () => void;
  isOfflineMode?: boolean;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  className?: string;
}

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleLayers,
  onToggleGeolocation,
  onDownloadOffline,
  isOfflineMode = false,
  canZoomIn = true,
  canZoomOut = true,
  className,
}) => {
  return (
    <div className={cn('absolute top-4 right-4 z-[1000] flex flex-col gap-2', className)}>
      <div className="flex flex-col bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          className="rounded-none border-none"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          className="rounded-none border-none border-t"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="rounded-none border-none border-t"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {onToggleLayers && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleLayers}
          className="bg-white dark:bg-neutral-900"
        >
          <Layers className="h-4 w-4" />
        </Button>
      )}

      {onToggleGeolocation && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleGeolocation}
          className="bg-white dark:bg-neutral-900"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      )}

      {onDownloadOffline && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadOffline}
          className="bg-white dark:bg-neutral-900"
        >
          {isOfflineMode ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

// Layer Switcher Component
interface LayerSwitcherProps {
  layers: MapTileLayer[];
  activeLayer: string;
  onLayerChange: (layerId: string) => void;
  className?: string;
}

const LayerSwitcher: React.FC<LayerSwitcherProps> = ({
  layers,
  activeLayer,
  onLayerChange,
  className,
}) => {
  return (
    <Card className={cn('absolute top-4 left-4 z-[1000] min-w-[200px]', className)}>
      <CardContent className="p-3">
        <h3 className="text-sm font-medium mb-2">Map Layers</h3>
        <div className="space-y-2">
          {layers.map((layer) => (
            <label key={layer.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mapLayer"
                checked={activeLayer === layer.id}
                onChange={() => onLayerChange(layer.id)}
                className="text-primary-600"
              />
              <span className="text-sm">{layer.name}</span>
              {layer.offline && (
                <Badge variant="secondary" className="text-xs">
                  Offline
                </Badge>
              )}
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Marker Component
interface MarkerComponentProps {
  marker: MapMarker;
  onClick?: (marker: MapMarker) => void;
  className?: string;
}

const MarkerComponent: React.FC<MarkerComponentProps> = ({
  marker,
  onClick,
  className,
}) => {
  return (
    <button
      className={cn(
        'flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors',
        className
      )}
      onClick={() => onClick?.(marker)}
      title={marker.title}
    >
      {marker.icon || <MapPin className="h-4 w-4" />}
    </button>
  );
};

// Cluster Component
interface ClusterComponentProps {
  cluster: MapCluster;
  onClick?: (cluster: MapCluster) => void;
  className?: string;
}

const ClusterComponent: React.FC<ClusterComponentProps> = ({
  cluster,
  onClick,
  className,
}) => {
  return (
    <button
      className={cn(
        'flex items-center justify-center w-10 h-10 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors font-medium text-sm',
        className
      )}
      onClick={() => onClick?.(cluster)}
      title={`${cluster.count} items`}
    >
      {cluster.count}
    </button>
  );
};

// Main Map Component (This would integrate with actual map library like Leaflet or Mapbox)
export const Map = React.forwardRef<HTMLDivElement, MapProps>(({
  center = [46.603354, 1.888334], // Center of France
  zoom = 6,
  markers = [],
  enableClustering = true,
  clusterRadius = 80,
  tileLayers = defaultTileLayers,
  defaultTileLayer = 'osm',
  enableOffline = false,
  height = '400px',
  width = '100%',
  className,
  onMarkerClick,
  onClusterClick,
  onBoundsChange,
  onZoomChange,
  showControls = true,
  showLayerSwitcher = false,
  enableGeolocation = false,
  style,
  ...props
}, ref) => {
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [currentCenter, setCurrentCenter] = useState(center);
  const [activeLayer, setActiveLayer] = useState(defaultTileLayer);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Cluster markers if clustering is enabled
  const displayItems = useMemo(() => {
    if (!enableClustering) return markers;
    return createClusters(markers, currentZoom, clusterRadius);
  }, [markers, enableClustering, currentZoom, clusterRadius]);

  // Map control handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(currentZoom + 1, 18);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(currentZoom - 1, 1);
    setCurrentZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [currentZoom, onZoomChange]);

  const handleReset = useCallback(() => {
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    onZoomChange?.(zoom);
  }, [center, zoom, onZoomChange]);

  const handleGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCenter: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(newCenter);
        setCurrentCenter(newCenter);
        setCurrentZoom(15);
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
  }, []);

  const handleDownloadOffline = useCallback(() => {
    setIsOfflineMode(!isOfflineMode);
    // In a real implementation, this would trigger offline tile downloading
    console.log('Toggle offline mode:', !isOfflineMode);
  }, [isOfflineMode]);

  // This is a placeholder implementation
  // In a real app, you would integrate with Leaflet, Mapbox, or another map library
  return (
    <div
      ref={ref}
      className={cn(mapVariants({ variant: 'default' }), className)}
      style={{ height, width, ...style }}
      {...props}
    >
      {/* Map placeholder - replace with actual map component */}
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900 dark:to-green-900 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Map Component Placeholder
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {markers.length} markers • Zoom: {currentZoom}
          </p>
        </div>
      </div>

      {/* Map overlay elements */}
      {showControls && (
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onToggleLayers={showLayerSwitcher ? () => setShowLayers(!showLayers) : undefined}
          onToggleGeolocation={enableGeolocation ? handleGeolocation : undefined}
          onDownloadOffline={enableOffline ? handleDownloadOffline : undefined}
          isOfflineMode={isOfflineMode}
          canZoomIn={currentZoom < 18}
          canZoomOut={currentZoom > 1}
        />
      )}

      {showLayers && showLayerSwitcher && (
        <LayerSwitcher
          layers={tileLayers}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
        />
      )}

      {/* Status indicators */}
      {isOfflineMode && (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <WifiOff className="h-3 w-3 mr-1" />
            Offline Mode
          </Badge>
        </div>
      )}

      {userLocation && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Navigation className="h-3 w-3 mr-1" />
            Location Found
          </Badge>
        </div>
      )}
    </div>
  );
});

Map.displayName = 'Map';

// Export all components
export {
  MapControls,
  LayerSwitcher,
  MarkerComponent,
  ClusterComponent,
  defaultTileLayers,
};