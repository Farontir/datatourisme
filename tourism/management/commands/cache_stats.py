"""
Commande Django pour afficher les statistiques du cache Redis
"""
from django.core.management.base import BaseCommand
from tourism.cache import CacheService


class Command(BaseCommand):
    help = 'Affiche les statistiques du cache Redis'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Statistiques du Cache Redis ===\n')
        )
        
        try:
            stats = CacheService.get_stats()
            
            if not stats:
                self.stdout.write(
                    self.style.WARNING('Impossible de récupérer les statistiques')
                )
                return
            
            # Affichage des statistiques
            self.stdout.write(f"Clients connectés: {stats.get('connected_clients', 'N/A')}")
            self.stdout.write(f"Mémoire utilisée: {stats.get('used_memory_human', 'N/A')}")
            self.stdout.write(f"Cache hits: {stats.get('keyspace_hits', 'N/A')}")
            self.stdout.write(f"Cache misses: {stats.get('keyspace_misses', 'N/A')}")
            self.stdout.write(f"Taux de réussite: {stats.get('hit_rate', 0):.2f}%")
            
            self.stdout.write(
                self.style.SUCCESS('\n✓ Statistiques affichées avec succès')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la récupération des statistiques: {e}')
            )