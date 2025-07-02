"""
Commande Django pour préchauffer le cache avec les données les plus consultées
"""
from django.core.management.base import BaseCommand
from django.core.paginator import Paginator
from tourism.models import TouristicResource
from tourism.cache import ResourceCacheService, SearchCacheService
from tourism.serializers import TouristicResourceDetailSerializer, TouristicResourceListSerializer


class Command(BaseCommand):
    help = 'Préchauffe le cache avec les données les plus consultées'

    def add_arguments(self, parser):
        parser.add_argument(
            '--resources',
            action='store_true',
            help='Préchauffer les ressources individuelles',
        )
        parser.add_argument(
            '--lists',
            action='store_true',
            help='Préchauffer les listes de ressources',
        )
        parser.add_argument(
            '--languages',
            nargs='+',
            default=['fr', 'en'],
            help='Langues à préchauffer (défaut: fr en)',
        )

    def handle(self, *args, **options):
        warmup_resources = options.get('resources', False)
        warmup_lists = options.get('lists', False)
        languages = options.get('languages', ['fr', 'en'])
        
        if not warmup_resources and not warmup_lists:
            warmup_resources = warmup_lists = True
        
        self.stdout.write(
            self.style.SUCCESS('=== Préchauffage du Cache ===\n')
        )
        
        try:
            if warmup_resources:
                self._warmup_resources(languages)
            
            if warmup_lists:
                self._warmup_lists(languages)
            
            self.stdout.write(
                self.style.SUCCESS('\n✓ Préchauffage terminé avec succès')
            )
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors du préchauffage: {e}')
            )

    def _warmup_resources(self, languages):
        """Préchauffe les ressources individuelles"""
        self.stdout.write('Préchauffage des ressources individuelles...')
        
        # Récupérer les ressources les plus récentes (top 50)
        resources = TouristicResource.objects.filter(is_active=True)[:50]
        
        count = 0
        for resource in resources:
            for lang in languages:
                # Sérialiser la ressource
                serializer = TouristicResourceDetailSerializer(
                    resource, 
                    context={'language': lang}
                )
                
                # Mettre en cache
                ResourceCacheService.set_resource(
                    resource.resource_id, 
                    serializer.data, 
                    lang
                )
                count += 1
        
        self.stdout.write(f'  → {count} ressources mises en cache')

    def _warmup_lists(self, languages):
        """Préchauffe les listes de ressources"""
        self.stdout.write('Préchauffage des listes de ressources...')
        
        # Types de ressources populaires
        popular_types = [
            'AccommodationObject',
            'CulturalSite', 
            'NaturalHeritage',
            'SportsAndLeisurePlace'
        ]
        
        count = 0
        for lang in languages:
            # Listes générales (première page)
            filters = {'lang': lang, 'search': '', 'ordering': '', 'page': '1'}
            resources = TouristicResource.objects.filter(is_active=True)[:20]
            
            serializer = TouristicResourceListSerializer(
                resources, 
                many=True, 
                context={'language': lang}
            )
            
            ResourceCacheService.set_resource_list(filters, serializer.data, 1, lang)
            count += 1
            
            # Listes par type populaire
            for resource_type in popular_types:
                type_resources = TouristicResource.objects.filter(
                    is_active=True,
                    resource_types__contains=[resource_type]
                )[:20]
                
                if type_resources.exists():
                    serializer = TouristicResourceListSerializer(
                        type_resources, 
                        many=True, 
                        context={'language': lang}
                    )
                    
                    SearchCacheService.set_search_results(
                        resource_type,
                        {'type': resource_type, 'page': '1'},
                        serializer.data,
                        lang
                    )
                    count += 1
        
        self.stdout.write(f'  → {count} listes mises en cache')