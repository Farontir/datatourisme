import json
from django.core.management.base import BaseCommand
from tourism.models import TouristicResource

class Command(BaseCommand):
    help = 'Exporte les ressources touristiques en JSON'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='export.json',
            help='Fichier de sortie'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['json', 'jsonld'],
            default='json',
            help='Format d\'export'
        )
    
    def handle(self, *args, **options):
        resources = TouristicResource.objects.filter(is_active=True)
        
        if options['format'] == 'jsonld':
            # Export au format JSON-LD original
            data = [resource.data for resource in resources]
        else:
            # Export simplifié
            data = []
            for resource in resources:
                data.append({
                    'id': resource.resource_id,
                    'name': resource.name,
                    'description': resource.description,
                    'types': resource.resource_types,
                    'location': {
                        'lat': resource.location.y if resource.location else None,
                        'lng': resource.location.x if resource.location else None
                    }
                })
        
        with open(options['output'], 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        self.stdout.write(
            self.style.SUCCESS(f'Export terminé: {len(data)} ressources exportées')
        )