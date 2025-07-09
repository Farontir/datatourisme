import React, { useState, useMemo } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Heart, Plus, X, GripVertical, Share, Folder, MoreHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './Dialog';
import { Badge } from './Badge';

// Types
export interface FavoriteItem {
  id: string;
  title: string;
  description?: string;
  image?: string;
  url?: string;
  tags?: string[];
  createdAt: Date;
  collectionId?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isPublic?: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Favorite Button Component
interface FavoriteButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
  loading?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

const favoriteButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm',
        outline: 'border border-neutral-200 bg-white/80 hover:bg-white',
        ghost: 'hover:bg-white/20',
      },
      size: {
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export const FavoriteButton = React.forwardRef<
  HTMLButtonElement,
  FavoriteButtonProps
>(({ isFavorited, onToggle, loading, size, variant, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(favoriteButtonVariants({ variant, size }), className)}
      onClick={onToggle}
      disabled={loading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
      ) : (
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            size === 'sm' && 'h-3 w-3',
            size === 'lg' && 'h-5 w-5',
            isFavorited ? 'fill-red-500 text-red-500' : 'text-neutral-600'
          )}
        />
      )}
    </button>
  );
});
FavoriteButton.displayName = 'FavoriteButton';

// Favorite Item Card Component
interface FavoriteItemCardProps {
  item: FavoriteItem;
  onRemove?: (id: string) => void;
  onMoveToCollection?: (itemId: string, collectionId: string) => void;
  collections?: Collection[];
  draggable?: boolean;
  className?: string;
}

export const FavoriteItemCard: React.FC<FavoriteItemCardProps> = ({
  item,
  onRemove,
  onMoveToCollection,
  collections = [],
  draggable = false,
  className,
}) => {
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        draggable && 'cursor-move',
        className
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {item.image && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {draggable && (
              <button className="p-1 hover:bg-neutral-100 rounded">
                <GripVertical className="h-3 w-3 text-neutral-400" />
              </button>
            )}
            
            <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
              <DialogTrigger asChild>
                <button className="p-1 hover:bg-neutral-100 rounded">
                  <MoreHorizontal className="h-3 w-3 text-neutral-400" />
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Move to Collection</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      className="w-full p-3 text-left hover:bg-neutral-50 rounded-md border"
                      onClick={() => {
                        onMoveToCollection?.(item.id, collection.id);
                        setShowMoveDialog(false);
                      }}
                    >
                      <div className="font-medium">{collection.name}</div>
                      <div className="text-sm text-neutral-600">
                        {collection.itemCount} items
                      </div>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <button
              className="p-1 hover:bg-neutral-100 rounded"
              onClick={() => onRemove?.(item.id)}
            >
              <X className="h-3 w-3 text-neutral-400" />
            </button>
          </div>
        </div>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <div className="text-xs text-neutral-500 mt-2">
          Added {item.createdAt.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};

// Collection Card Component
interface CollectionCardProps {
  collection: Collection;
  onEdit?: (collection: Collection) => void;
  onDelete?: (id: string) => void;
  onShare?: (collection: Collection) => void;
  onClick?: (collection: Collection) => void;
  className?: string;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onEdit,
  onDelete,
  onShare,
  onClick,
  className,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    // Handle drop logic would be implemented by parent component
    console.log('Dropped item', itemId, 'into collection', collection.id);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        className
      )}
      onClick={() => onClick?.(collection)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: collection.color || '#6b7280' }}
            />
            <CardTitle className="text-sm">{collection.name}</CardTitle>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {collection.isPublic && onShare && (
              <button
                className="p-1 hover:bg-neutral-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(collection);
                }}
              >
                <Share className="h-3 w-3 text-neutral-400" />
              </button>
            )}
            
            {onEdit && (
              <button
                className="p-1 hover:bg-neutral-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(collection);
                }}
              >
                <MoreHorizontal className="h-3 w-3 text-neutral-400" />
              </button>
            )}
          </div>
        </div>
        
        {collection.description && (
          <p className="text-xs text-neutral-600 mt-1">
            {collection.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{collection.itemCount} items</span>
          <span>Updated {collection.updatedAt.toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Favorites List Component
interface FavoritesListProps {
  items: FavoriteItem[];
  collections?: Collection[];
  onRemoveItem?: (id: string) => void;
  onMoveToCollection?: (itemId: string, collectionId: string) => void;
  onCreateCollection?: () => void;
  enableDragDrop?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  items,
  collections = [],
  onRemoveItem,
  onMoveToCollection,
  onCreateCollection,
  enableDragDrop = false,
  viewMode = 'grid',
  className,
}) => {
  const groupedItems = useMemo(() => {
    const grouped: { [key: string]: FavoriteItem[] } = {
      uncategorized: [],
    };

    collections.forEach((collection) => {
      grouped[collection.id] = [];
    });

    items.forEach((item) => {
      const key = item.collectionId || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  }, [items, collections]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          No favorites yet
        </h3>
        <p className="text-neutral-600 mb-4">
          Start adding items to your favorites to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {Object.entries(groupedItems).map(([key, groupItems]) => {
        if (groupItems.length === 0) return null;
        
        const collection = collections.find(c => c.id === key);
        const title = collection?.name || 'Favorites';
        
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              {key === 'uncategorized' && onCreateCollection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCreateCollection}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Collection
                </Button>
              )}
            </div>
            
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2'
              )}
            >
              {groupItems.map((item) => (
                <FavoriteItemCard
                  key={item.id}
                  item={item}
                  onRemove={onRemoveItem}
                  onMoveToCollection={onMoveToCollection}
                  collections={collections}
                  draggable={enableDragDrop}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Collections Grid Component
interface CollectionsGridProps {
  collections: Collection[];
  onEdit?: (collection: Collection) => void;
  onDelete?: (id: string) => void;
  onShare?: (collection: Collection) => void;
  onClick?: (collection: Collection) => void;
  onCreateNew?: () => void;
  className?: string;
}

export const CollectionsGrid: React.FC<CollectionsGridProps> = ({
  collections,
  onEdit,
  onDelete,
  onShare,
  onClick,
  onCreateNew,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Collections</h2>
        {onCreateNew && (
          <Button
            onClick={onCreateNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </Button>
        )}
      </div>
      
      {collections.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            No collections yet
          </h3>
          <p className="text-neutral-600 mb-4">
            Create collections to organize your favorites.
          </p>
          {onCreateNew && (
            <Button onClick={onCreateNew}>Create your first collection</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onEdit={onEdit}
              onDelete={onDelete}
              onShare={onShare}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};