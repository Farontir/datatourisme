import json
from django.core.management.base import BaseCommand
from tourism.services import JsonLdImportService

class Command(BaseCommand):
    help = 'Importe des fichiers JSON-LD'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'file_path',
            type=str,
            help='Chemin vers le fichier JSON-LD'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Met à jour les ressources existantes'
        )
    
    def handle(self, *args, **options):
        file_path = options['file_path']
        
        self.stdout.write(f"Import du fichier: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            service = JsonLdImportService()
            
            # Import d'une seule ressource ou d'une liste
            if isinstance(data, list):
                for item in data:
                    service.import_resource(item)
            else:
                service.import_resource(data)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Import terminé: {service.imported_count} ressources importées"
                )
            )
            
            if service.errors:
                self.stdout.write(self.style.ERROR("Erreurs rencontrées:"))
                for error in service.errors:
                    self.stdout.write(self.style.ERROR(f"  - {error}"))
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Erreur lors de l'import: {str(e)}")
            )