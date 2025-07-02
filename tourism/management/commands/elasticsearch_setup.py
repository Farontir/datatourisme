"""
Commande Django pour configurer et initialiser Elasticsearch
"""
from django.core.management.base import BaseCommand
from django_elasticsearch_dsl.registries import registry
from elasticsearch.exceptions import ConnectionError, RequestError
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Configure et initialise les index Elasticsearch'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-only',
            action='store_true',
            help='Créer uniquement les index sans les peupler',
        )
        parser.add_argument(
            '--rebuild',
            action='store_true',
            help='Recréer les index en supprimant les existants',
        )

    def handle(self, *args, **options):
        create_only = options.get('create_only', False)
        rebuild = options.get('rebuild', False)
        
        self.stdout.write(
            self.style.SUCCESS('=== Configuration Elasticsearch ===\n')
        )
        
        try:
            # Vérifier la connexion Elasticsearch
            if not self._check_elasticsearch_connection():
                return
            
            # Créer/recréer les index
            if rebuild:
                self._rebuild_indexes()
            else:
                self._create_indexes()
            
            # Peupler les index si demandé
            if not create_only:
                self._populate_indexes()
            
            self.stdout.write(
                self.style.SUCCESS('\n✓ Configuration Elasticsearch terminée')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la configuration: {e}')
            )

    def _check_elasticsearch_connection(self) -> bool:
        """Vérifie la connexion à Elasticsearch"""
        
        self.stdout.write('Vérification de la connexion Elasticsearch...')
        
        try:
            from elasticsearch_dsl import connections
            
            # Obtenir la connexion par défaut
            es = connections.get_connection()
            
            # Tester la connexion
            if es.ping():
                info = es.info()
                self.stdout.write(
                    f"  → Connexion réussie à Elasticsearch {info['version']['number']}"
                )
                return True
            else:
                self.stdout.write(
                    self.style.ERROR('  ✗ Impossible de se connecter à Elasticsearch')
                )
                return False
                
        except ConnectionError:
            self.stdout.write(
                self.style.ERROR('  ✗ Elasticsearch n\'est pas accessible')
            )
            return False
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Erreur de connexion: {e}')
            )
            return False

    def _create_indexes(self):
        """Crée les index Elasticsearch"""
        
        self.stdout.write('Création des index Elasticsearch...')
        
        try:
            for doc_class in registry.get_documents():
                index_name = doc_class._index._name
                
                # Vérifier si l'index existe déjà
                if doc_class._index.exists():
                    self.stdout.write(f"  → Index '{index_name}' existe déjà")
                else:
                    # Créer l'index
                    doc_class._index.create()
                    self.stdout.write(f"  → Index '{index_name}' créé")
                    
        except RequestError as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la création des index: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur inattendue: {e}')
            )

    def _rebuild_indexes(self):
        """Recrée les index Elasticsearch en supprimant les existants"""
        
        self.stdout.write('Reconstruction des index Elasticsearch...')
        
        try:
            for doc_class in registry.get_documents():
                index_name = doc_class._index._name
                
                # Supprimer l'index s'il existe
                if doc_class._index.exists():
                    doc_class._index.delete()
                    self.stdout.write(f"  → Index '{index_name}' supprimé")
                
                # Créer le nouvel index
                doc_class._index.create()
                self.stdout.write(f"  → Index '{index_name}' recréé")
                
        except RequestError as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la reconstruction: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur inattendue: {e}')
            )

    def _populate_indexes(self):
        """Peuple les index avec les données existantes"""
        
        self.stdout.write('Peuplement des index avec les données existantes...')
        
        try:
            from tourism.models import TouristicResource
            
            # Compter les ressources actives
            total_resources = TouristicResource.objects.filter(is_active=True).count()
            
            if total_resources == 0:
                self.stdout.write('  → Aucune ressource active à indexer')
                return
            
            self.stdout.write(f'  → {total_resources} ressources à indexer')
            
            # Utiliser la commande de peuplement Django Elasticsearch DSL
            from django.core.management import call_command
            call_command('search_index', '--populate')
            
            self.stdout.write('  → Indexation terminée')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors du peuplement: {e}')
            )