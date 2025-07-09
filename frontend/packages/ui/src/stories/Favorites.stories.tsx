import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  FavoriteButton,
  FavoriteItemCard,
  CollectionCard,
  FavoritesList,
  CollectionsGrid,
  FavoriteItem,
  Collection,
} from '../components/Favorites';
import { useFavorites } from '../hooks/use-favorites';
import { Button } from '../components/Button';

const meta: Meta = {
  title: 'UI/Favorites',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

// Sample data
const sampleItems: FavoriteItem[] = [
  {
    id: '1',
    title: 'Beautiful Mountain View',
    description: 'A stunning view of the mountains during sunset with amazing colors.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    tags: ['nature', 'mountains', 'sunset'],
    createdAt: new Date('2024-01-15'),
    collectionId: 'nature',
  },
  {
    id: '2',
    title: 'Historic Castle',
    description: 'Medieval castle with rich history and architectural beauty.',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop',
    tags: ['history', 'castle', 'architecture'],
    createdAt: new Date('2024-01-20'),
    collectionId: 'culture',
  },
  {
    id: '3',
    title: 'City Skyline',
    description: 'Modern city skyline at night with illuminated buildings.',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
    tags: ['city', 'skyline', 'night'],
    createdAt: new Date('2024-01-25'),
  },
  {
    id: '4',
    title: 'Beach Paradise',
    description: 'Tropical beach with crystal clear water and white sand.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    tags: ['beach', 'tropical', 'paradise'],
    createdAt: new Date('2024-02-01'),
    collectionId: 'nature',
  },
];

const sampleCollections: Collection[] = [
  {
    id: 'nature',
    name: 'Nature & Landscapes',
    description: 'Beautiful natural places and landscapes',
    color: '#10b981',
    isPublic: true,
    itemCount: 2,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'culture',
    name: 'Cultural Heritage',
    description: 'Historical and cultural sites',
    color: '#8b5cf6',
    isPublic: false,
    itemCount: 1,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'urban',
    name: 'Urban Exploration',
    description: 'Cities and urban landscapes',
    color: '#f59e0b',
    isPublic: true,
    itemCount: 0,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18'),
  },
];

// Favorite Button Story
function FavoriteButtonDemo() {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsFavorited(!isFavorited);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Favorite Button Variants</h3>
        <div className="flex items-center justify-center gap-4">
          <FavoriteButton
            isFavorited={isFavorited}
            onToggle={handleToggle}
            loading={loading}
            size="sm"
          />
          <FavoriteButton
            isFavorited={isFavorited}
            onToggle={handleToggle}
            loading={loading}
            size="default"
          />
          <FavoriteButton
            isFavorited={isFavorited}
            onToggle={handleToggle}
            loading={loading}
            size="lg"
          />
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">Different Variants</h3>
        <div className="flex items-center justify-center gap-4">
          <FavoriteButton
            isFavorited={true}
            onToggle={() => {}}
            variant="default"
          />
          <FavoriteButton
            isFavorited={true}
            onToggle={() => {}}
            variant="outline"
          />
          <FavoriteButton
            isFavorited={true}
            onToggle={() => {}}
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
}

export const FavoriteButtons: StoryObj = {
  render: () => <FavoriteButtonDemo />,
};

// Favorite Item Card Story
export const FavoriteItemCards: StoryObj = {
  render: () => (
    <div className="max-w-sm space-y-4">
      {sampleItems.slice(0, 2).map((item) => (
        <FavoriteItemCard
          key={item.id}
          item={item}
          collections={sampleCollections}
          onRemove={(id) => console.log('Remove item:', id)}
          onMoveToCollection={(itemId, collectionId) =>
            console.log('Move item:', itemId, 'to collection:', collectionId)
          }
          draggable
        />
      ))}
    </div>
  ),
};

// Collection Cards Story
export const CollectionCards: StoryObj = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
      {sampleCollections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onEdit={(collection) => console.log('Edit collection:', collection)}
          onShare={(collection) => console.log('Share collection:', collection)}
          onClick={(collection) => console.log('View collection:', collection)}
        />
      ))}
    </div>
  ),
};

// Interactive Favorites Demo
function InteractiveFavoritesDemo() {
  const {
    favorites,
    collections,
    addFavorite,
    removeFavorite,
    createCollection,
    moveToCollection,
  } = useFavorites({
    initialFavorites: sampleItems,
    initialCollections: sampleCollections,
    enableStorage: false,
  });

  const handleCreateCollection = () => {
    const name = prompt('Collection name:');
    if (name) {
      createCollection({
        name,
        description: 'New collection',
        color: '#6b7280',
        isPublic: false,
      });
    }
  };

  const handleAddFavorite = () => {
    const newItem: Omit<FavoriteItem, 'id' | 'createdAt'> = {
      title: 'New Favorite Item',
      description: 'A newly added favorite item',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      tags: ['new', 'sample'],
    };
    addFavorite(newItem);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Favorites</h2>
        <div className="flex gap-2">
          <Button onClick={handleAddFavorite} variant="outline">
            Add Favorite
          </Button>
          <Button onClick={handleCreateCollection}>
            Create Collection
          </Button>
        </div>
      </div>

      <FavoritesList
        items={favorites}
        collections={collections}
        onRemoveItem={removeFavorite}
        onMoveToCollection={moveToCollection}
        onCreateCollection={handleCreateCollection}
        enableDragDrop
        viewMode="grid"
      />
    </div>
  );
}

export const InteractiveFavorites: StoryObj = {
  render: () => <InteractiveFavoritesDemo />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Interactive demo showing the complete favorites system with drag & drop.',
      },
    },
  },
};

// Collections Grid Story
function CollectionsGridDemoComponent() {
  const {
    collections,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useFavorites({
    initialCollections: sampleCollections,
    enableStorage: false,
  });

  const handleCreateNew = () => {
    const name = prompt('Collection name:');
    if (name) {
      createCollection({
        name,
        description: 'New collection description',
        color: '#6b7280',
        isPublic: false,
      });
    }
  };

  const handleEdit = (collection: Collection) => {
    const newName = prompt('New name:', collection.name);
    if (newName && newName !== collection.name) {
      updateCollection(collection.id, { name: newName });
    }
  };

  return (
    <div className="max-w-6xl">
      <CollectionsGrid
        collections={collections}
        onCreateNew={handleCreateNew}
        onEdit={handleEdit}
        onDelete={deleteCollection}
        onShare={(collection) => console.log('Share collection:', collection)}
        onClick={(collection) => console.log('View collection:', collection)}
      />
    </div>
  );
}

export const CollectionsGridDemo: StoryObj = {
  render: () => <CollectionsGridDemoComponent />,
  parameters: {
    layout: 'fullscreen',
  },
};

// Empty State Story
export const EmptyState: StoryObj = {
  render: () => (
    <div className="max-w-4xl">
      <FavoritesList
        items={[]}
        collections={[]}
        onCreateCollection={() => console.log('Create collection')}
      />
    </div>
  ),
};