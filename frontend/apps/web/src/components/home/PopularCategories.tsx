import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  Badge,
  Mountain, 
  UtensilsCrossed, 
  Camera, 
  TreePine, 
  Waves, 
  Building2, 
  Palette, 
  Crown 
} from '@datatourisme/ui';

// This would normally fetch from your API
async function getPopularCategories() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 150));
  
  return [
    {
      id: 'mountains',
      name: 'Montagnes',
      count: 1247,
      icon: Mountain,
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    },
    {
      id: 'restaurants',
      name: 'Gastronomie',
      count: 2134,
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    },
    {
      id: 'monuments',
      name: 'Monuments',
      count: 856,
      icon: Camera,
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    },
    {
      id: 'nature',
      name: 'Nature',
      count: 1892,
      icon: TreePine,
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    },
    {
      id: 'beaches',
      name: 'Plages',
      count: 634,
      icon: Waves,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    },
    {
      id: 'cities',
      name: 'Villes',
      count: 445,
      icon: Building2,
      color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    },
    {
      id: 'culture',
      name: 'Culture',
      count: 1123,
      icon: Palette,
      color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    },
    {
      id: 'heritage',
      name: 'Patrimoine',
      count: 789,
      icon: Crown,
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    },
  ];
}

export async function PopularCategories() {
  const categories = await getPopularCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Link key={category.id} href={`/search?category=${category.id}`}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-1">
              <CardContent className="p-4 text-center">
                <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${category.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {category.name}
                </h3>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {category.count.toLocaleString('fr-FR')} lieux
                </Badge>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}