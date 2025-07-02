"""
Commande Django pour afficher les statistiques Elasticsearch
"""
from django.core.management.base import BaseCommand
from elasticsearch_dsl import connections
from elasticsearch.exceptions import ConnectionError
import json


class Command(BaseCommand):
    help = 'Affiche les statistiques des index Elasticsearch'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Afficher des statistiques détaillées',
        )

    def handle(self, *args, **options):
        detailed = options.get('detailed', False)
        
        self.stdout.write(
            self.style.SUCCESS('=== Statistiques Elasticsearch ===\n')
        )
        
        try:
            es = connections.get_connection()
            
            if not es.ping():
                self.stdout.write(
                    self.style.ERROR('Elasticsearch n\'est pas accessible')
                )
                return
            
            # Informations générales
            self._show_cluster_info(es)
            
            # Statistiques des index
            self._show_index_stats(es, detailed)
            
            # Statistiques détaillées si demandées
            if detailed:
                self._show_detailed_stats(es)
            
        except ConnectionError:
            self.stdout.write(
                self.style.ERROR('Impossible de se connecter à Elasticsearch')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur: {e}')
            )

    def _show_cluster_info(self, es):
        """Affiche les informations du cluster"""
        
        try:
            info = es.info()
            health = es.cluster.health()
            
            self.stdout.write('Informations du cluster:')
            self.stdout.write(f"  Version: {info['version']['number']}")
            self.stdout.write(f"  Nom du cluster: {info['cluster_name']}")
            self.stdout.write(f"  Statut: {health['status']}")
            self.stdout.write(f"  Nœuds: {health['number_of_nodes']}")
            self.stdout.write('')
            
        except Exception as e:
            self.stdout.write(f"Erreur informations cluster: {e}")

    def _show_index_stats(self, es, detailed=False):
        """Affiche les statistiques des index"""
        
        try:
            # Lister tous les index
            indexes = es.cat.indices(format='json')
            
            if not indexes:
                self.stdout.write('Aucun index trouvé')
                return
            
            self.stdout.write('Index Elasticsearch:')
            
            for index in indexes:
                index_name = index['index']
                
                # Filtrer les index système
                if index_name.startswith('.'):
                    continue
                
                docs_count = index.get('docs.count', '0')
                store_size = index.get('store.size', '0b')
                health = index.get('health', 'unknown')
                
                self.stdout.write(f"  → {index_name}")
                self.stdout.write(f"    Documents: {docs_count}")
                self.stdout.write(f"    Taille: {store_size}")
                self.stdout.write(f"    Statut: {health}")
                
                if detailed:
                    self._show_index_mapping(es, index_name)
                
                self.stdout.write('')
                
        except Exception as e:
            self.stdout.write(f"Erreur statistiques index: {e}")

    def _show_index_mapping(self, es, index_name):
        """Affiche le mapping d'un index"""
        
        try:
            mapping = es.indices.get_mapping(index=index_name)
            
            if index_name in mapping:
                mappings = mapping[index_name].get('mappings', {})
                properties = mappings.get('properties', {})
                
                self.stdout.write(f"    Champs mappés: {len(properties)}")
                
                # Afficher quelques champs principaux
                main_fields = ['name', 'description', 'location', 'resource_types']
                for field in main_fields:
                    if field in properties:
                        field_type = properties[field].get('type', 'object')
                        self.stdout.write(f"      - {field}: {field_type}")
                        
        except Exception as e:
            self.stdout.write(f"    Erreur mapping: {e}")

    def _show_detailed_stats(self, es):
        """Affiche des statistiques détaillées"""
        
        try:
            self.stdout.write('Statistiques détaillées:')
            
            # Statistiques des nœuds
            nodes_stats = es.nodes.stats()
            
            if 'nodes' in nodes_stats:
                total_docs = 0
                total_size_bytes = 0
                
                for node_id, node_data in nodes_stats['nodes'].items():
                    indices_stats = node_data.get('indices', {})
                    docs = indices_stats.get('docs', {})
                    store = indices_stats.get('store', {})
                    
                    total_docs += docs.get('count', 0)
                    total_size_bytes += store.get('size_in_bytes', 0)
                
                # Convertir la taille en format lisible
                size_mb = total_size_bytes / (1024 * 1024)
                
                self.stdout.write(f"  Total documents: {total_docs:,}")
                self.stdout.write(f"  Taille totale: {size_mb:.2f} MB")
            
            # Statistiques des recherches
            self._show_search_stats(es)
            
        except Exception as e:
            self.stdout.write(f"Erreur statistiques détaillées: {e}")

    def _show_search_stats(self, es):
        """Affiche les statistiques des recherches"""
        
        try:
            stats = es.indices.stats(metric='search')
            
            if '_all' in stats and 'total' in stats['_all']:
                search_stats = stats['_all']['total']['search']
                
                query_total = search_stats.get('query_total', 0)
                query_time_ms = search_stats.get('query_time_in_millis', 0)
                
                avg_time = (query_time_ms / query_total) if query_total > 0 else 0
                
                self.stdout.write('  Statistiques de recherche:')
                self.stdout.write(f"    Requêtes totales: {query_total:,}")
                self.stdout.write(f"    Temps moyen: {avg_time:.2f} ms")
                
        except Exception as e:
            self.stdout.write(f"Erreur stats recherche: {e}")