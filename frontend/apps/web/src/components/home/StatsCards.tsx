import { Card, CardContent, TrendingUp, Users, MapPin, Star } from '@datatourisme/ui';

// This would normally fetch from your API
async function getStats() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    totalResources: 12847,
    totalUsers: 45632,
    totalLocations: 1247,
    averageRating: 4.2,
  };
}

export async function StatsCards() {
  const stats = await getStats();

  const statItems = [
    {
      title: 'Ressources touristiques',
      value: stats.totalResources.toLocaleString('fr-FR'),
      icon: TrendingUp,
      description: 'Activités et lieux référencés',
      trend: '+12% ce mois',
    },
    {
      title: 'Utilisateurs actifs',
      value: stats.totalUsers.toLocaleString('fr-FR'),
      icon: Users,
      description: 'Voyageurs connectés',
      trend: '+8% ce mois',
    },
    {
      title: 'Destinations',
      value: stats.totalLocations.toLocaleString('fr-FR'),
      icon: MapPin,
      description: 'Villes et régions',
      trend: '+15 cette semaine',
    },
    {
      title: 'Note moyenne',
      value: stats.averageRating.toString(),
      icon: Star,
      description: 'Satisfaction utilisateurs',
      trend: 'Stable',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    {item.title}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {item.value}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {item.description}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xs text-success-600 dark:text-success-400 font-medium">
                  {item.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}