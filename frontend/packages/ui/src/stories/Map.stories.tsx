import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Map, MapMarker, defaultTileLayers } from '../components/Map';
import { useMap } from '../hooks/use-map';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { MapPin, Star, Camera, Mountain, Building } from 'lucide-react';

const meta: Meta<typeof Map> = {
  title: 'UI/Map',
  component: Map,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    center: {
      control: 'object',
      description: 'Map center coordinates [lat, lng]',
    },
    zoom: {
      control: { type: 'range', min: 1, max: 18, step: 1 },
      description: 'Map zoom level',
    },
    enableClustering: {
      control: 'boolean',
      description: 'Enable marker clustering',
    },
    showControls: {
      control: 'boolean',
      description: 'Show map controls',
    },
    showLayerSwitcher: {
      control: 'boolean',
      description: 'Show layer switcher',
    },
    enableGeolocation: {
      control: 'boolean',
      description: 'Enable geolocation',
    },
    enableOffline: {
      control: 'boolean',
      description: 'Enable offline capabilities',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample markers for stories
const sampleMarkers: MapMarker[] = [
  {
    id: '1',
    position: [48.8566, 2.3522], // Paris
    title: 'Eiffel Tower',
    description: 'Iconic iron lattice tower on the Champ de Mars',
    category: 'monument',
    icon: <Star className="h-4 w-4" />,
  },
  {
    id: '2',
    position: [48.8606, 2.3376], // Louvre
    title: 'Louvre Museum',
    description: 'World\'s largest art museum',
    category: 'museum',
    icon: <Building className="h-4 w-4" />,
  },
  {
    id: '3',
    position: [48.8530, 2.3499], // Notre-Dame
    title: 'Notre-Dame Cathedral',
    description: 'Medieval Catholic cathedral',
    category: 'monument',
    icon: <Building className="h-4 w-4" />,
  },
  {
    id: '4',
    position: [43.7102, 7.2620], // Nice
    title: 'Nice',
    description: 'Beautiful coastal city on the French Riviera',
    category: 'city',
    icon: <Mountain className="h-4 w-4" />,
  },
  {
    id: '5',
    position: [45.764, 4.8357], // Lyon
    title: 'Lyon',
    description: 'Historic city known for its cuisine',
    category: 'city',
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    id: '6',
    position: [44.8378, -0.5792], // Bordeaux
    title: 'Bordeaux',
    description: 'World-renowned wine region',
    category: 'city',
    icon: <Camera className="h-4 w-4" />,
  },
];

// Basic Map Story
export const Default: Story = {
  args: {
    center: [46.603354, 1.888334],
    zoom: 6,
    markers: sampleMarkers,
    height: '500px',
    enableClustering: true,
    showControls: true,
    enableGeolocation: false,
    enableOffline: false,
  },
};

// Map with clustering disabled
export const WithoutClustering: Story = {
  args: {
    ...Default.args,
    enableClustering: false,
    zoom: 8,
    center: [48.8566, 2.3522], // Centered on Paris
  },
};

// Map with layer switcher
export const WithLayerSwitcher: Story = {
  args: {
    ...Default.args,
    showLayerSwitcher: true,
    tileLayers: defaultTileLayers,
  },
};

// Interactive Map Demo
function InteractiveMapDemo() {
  const {
    center,
    zoom,
    markers,
    userLocation,
    isLocating,
    isOfflineMode,
    offlineRegions,
    addMarker,
    removeMarker,
    getCurrentLocation,
    toggleOfflineMode,
    downloadRegion,
    searchMarkers,
  } = useMap({
    initialMarkers: sampleMarkers,
    enableGeolocation: true,
    enableOfflineStorage: true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  const handleMapClick = (event: any) => {
    // In a real implementation, you'd get coordinates from the map click event
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      position: [46 + Math.random() * 4, 1 + Math.random() * 4], // Random position in France
      title: 'New Marker',
      description: 'Added by clicking the map',
      category: 'custom',
    };
    addMarker(newMarker);
  };

  const handleDownloadRegion = () => {
    const bounds = {
      north: 49.5,
      south: 42.5,
      east: 8.5,
      west: -5.5,
    };
    downloadRegion(bounds, 'France');
  };

  const filteredMarkers = searchQuery 
    ? searchMarkers(searchQuery)
    : markers;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search markers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-md text-sm"
          />
          <Badge variant="secondary">
            {filteredMarkers.length} markers
          </Badge>
        </div>

        <Button
          onClick={getCurrentLocation}
          disabled={isLocating}
          size="sm"
          variant="outline"
        >
          {isLocating ? 'Locating...' : 'Find My Location'}
        </Button>

        <Button
          onClick={toggleOfflineMode}
          size="sm"
          variant={isOfflineMode ? 'default' : 'outline'}
        >
          {isOfflineMode ? 'Online Mode' : 'Offline Mode'}
        </Button>

        <Button
          onClick={handleDownloadRegion}
          size="sm"
          variant="outline"
        >
          Download France ({offlineRegions.length} regions saved)
        </Button>

        <Button
          onClick={handleMapClick}
          size="sm"
          variant="outline"
        >
          Add Random Marker
        </Button>
      </div>

      {/* Status */}
      {userLocation && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Your location: {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
          </p>
        </div>
      )}

      {selectedMarker && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-900">{selectedMarker.title}</h3>
              <p className="text-sm text-green-700">{selectedMarker.description}</p>
            </div>
            <Button
              onClick={() => removeMarker(selectedMarker.id)}
              size="sm"
              variant="destructive"
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Map */}
      <Map
        center={center}
        zoom={zoom}
        markers={filteredMarkers}
        height="600px"
        enableClustering
        showControls
        showLayerSwitcher
        enableGeolocation
        enableOffline
        onMarkerClick={setSelectedMarker}
        tileLayers={defaultTileLayers}
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveMapDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive map demo with search, geolocation, offline capabilities, and marker management.',
      },
    },
  },
};

// Clustered markers demo
function ClusteredMarkersDemo() {
  // Generate many markers for clustering demonstration
  const manyMarkers: MapMarker[] = [];
  
  // Add markers around major French cities
  const cities = [
    { name: 'Paris', center: [48.8566, 2.3522] },
    { name: 'Lyon', center: [45.764, 4.8357] },
    { name: 'Marseille', center: [43.2965, 5.3698] },
    { name: 'Toulouse', center: [43.6047, 1.4442] },
    { name: 'Nice', center: [43.7102, 7.2620] },
  ];

  cities.forEach((city, cityIndex) => {
    for (let i = 0; i < 20; i++) {
      manyMarkers.push({
        id: `${city.name}-${i}`,
        position: [
          city.center[0] + (Math.random() - 0.5) * 0.2,
          city.center[1] + (Math.random() - 0.5) * 0.2,
        ] as [number, number],
        title: `${city.name} Location ${i + 1}`,
        description: `Point of interest in ${city.name}`,
        category: 'poi',
      });
    }
  });

  return (
    <div className="space-y-4">
      <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
        <p className="text-sm">
          This demo shows {manyMarkers.length} markers clustered by proximity. 
          Zoom in to see individual markers, zoom out to see clusters.
        </p>
      </div>
      
      <Map
        markers={manyMarkers}
        height="600px"
        enableClustering
        clusterRadius={60}
        showControls
        center={[46.603354, 1.888334]}
        zoom={6}
      />
    </div>
  );
}

export const ClusteredMarkers: Story = {
  render: () => <ClusteredMarkersDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Demonstration of marker clustering with 100 markers distributed across French cities.',
      },
    },
  },
};

// Small embedded map
export const Embedded: Story = {
  args: {
    center: [48.8566, 2.3522],
    zoom: 12,
    markers: sampleMarkers.slice(0, 3),
    height: '300px',
    showControls: false,
    enableClustering: false,
  },
  parameters: {
    layout: 'centered',
  },
};