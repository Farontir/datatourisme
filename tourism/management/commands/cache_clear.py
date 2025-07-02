"""
Commande Django pour vider le cache Redis
"""
from django.core.management.base import BaseCommand
from tourism.cache import CacheService


class Command(BaseCommand):
    help = 'Vide le cache Redis (tout ou par pattern)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pattern',
            type=str,
            help='Pattern pour supprimer des clés spécifiques (ex: "res:*" pour les ressources)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Vider tout le cache',
        )

    def handle(self, *args, **options):
        pattern = options.get('pattern')
        clear_all = options.get('all')
        
        if not pattern and not clear_all:
            self.stdout.write(
                self.style.ERROR('Veuillez spécifier --pattern ou --all')
            )
            return
        
        try:
            if clear_all:
                self.stdout.write('Vidage de tout le cache...')
                success = CacheService.clear_all()
                
                if success:
                    self.stdout.write(
                        self.style.SUCCESS('✓ Cache entièrement vidé')
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR('✗ Erreur lors du vidage du cache')
                    )
            
            elif pattern:
                self.stdout.write(f'Suppression des clés correspondant au pattern: {pattern}')
                deleted_count = CacheService.delete_pattern(pattern)
                
                self.stdout.write(
                    self.style.SUCCESS(f'✓ {deleted_count} clés supprimées')
                )
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur: {e}')
            )