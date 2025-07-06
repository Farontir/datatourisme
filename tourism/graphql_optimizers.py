"""
Optimiseurs GraphQL pour résoudre les problèmes N+1 et améliorer les performances
"""
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict
from django.db.models import Prefetch, Q, QuerySet
from django.db.models.query import prefetch_related_objects
from graphene_django import DjangoObjectType
from graphene_django.utils import maybe_queryset
from graphql import GraphQLResolveInfo
from functools import wraps
import logging

from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation
from .metrics import ApplicationMetrics, time_it

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """Optimiseur de requêtes pour GraphQL"""
    
    def __init__(self):
        self.field_to_model_map = {
            'opening_hours': OpeningHours,
            'prices': PriceSpecification,
            'media': MediaRepresentation,
        }
        
        # Cache des optimisations par type de requête
        self._optimization_cache = {}
    
    def analyze_query_info(self, info: GraphQLResolveInfo) -> Dict[str, Any]:
        """
        Analyse les informations de la requête GraphQL pour détecter les optimisations nécessaires
        
        Args:
            info: Informations de résolution GraphQL
            
        Returns:
            Dictionnaire avec les optimisations à appliquer
        """
        field_nodes = info.field_nodes
        optimization_plan = {
            'select_related': set(),
            'prefetch_related': [],
            'only_fields': set(),
            'defer_fields': set(),
            'nested_queries': defaultdict(list)
        }
        
        for field_node in field_nodes:
            self._analyze_selection_set(field_node.selection_set, optimization_plan)
        
        return optimization_plan
    
    def _analyze_selection_set(self, selection_set, optimization_plan: Dict[str, Any], path: str = ""):
        """
        Analyse récursive des sélections GraphQL
        
        Args:
            selection_set: Set de sélections GraphQL
            optimization_plan: Plan d'optimisation à compléter
            path: Chemin actuel dans la requête
        """
        if not selection_set:
            return
        
        for selection in selection_set.selections:
            field_name = selection.name.value
            full_path = f"{path}.{field_name}" if path else field_name
            
            # Détecter les relations à précharger
            if field_name in self.field_to_model_map:
                optimization_plan['prefetch_related'].append(field_name)
                
                # Analyser les sous-sélections
                if selection.selection_set:
                    nested_fields = []
                    for nested_selection in selection.selection_set.selections:
                        nested_fields.append(nested_selection.name.value)
                    optimization_plan['nested_queries'][field_name] = nested_fields
            
            # Détecter les champs de relation foreign key
            elif field_name in ['category', 'region', 'department']:
                optimization_plan['select_related'].add(field_name)
            
            # Ajouter aux champs à récupérer
            optimization_plan['only_fields'].add(field_name)
            
            # Analyser récursivement les sous-sélections
            if selection.selection_set:
                self._analyze_selection_set(
                    selection.selection_set, 
                    optimization_plan, 
                    full_path
                )
    
    def optimize_queryset(self, queryset: QuerySet, optimization_plan: Dict[str, Any]) -> QuerySet:
        """
        Applique les optimisations au QuerySet
        
        Args:
            queryset: QuerySet à optimiser
            optimization_plan: Plan d'optimisation
            
        Returns:
            QuerySet optimisé
        """
        optimized_qs = queryset
        
        # Appliquer select_related
        if optimization_plan['select_related']:
            optimized_qs = optimized_qs.select_related(*optimization_plan['select_related'])
            logger.debug(f"Applied select_related: {optimization_plan['select_related']}")
        
        # Appliquer prefetch_related avec optimisations spécifiques
        prefetch_objects = []
        for prefetch_field in optimization_plan['prefetch_related']:
            prefetch_obj = self._create_optimized_prefetch(
                prefetch_field, 
                optimization_plan['nested_queries'].get(prefetch_field, [])
            )
            prefetch_objects.append(prefetch_obj)
        
        if prefetch_objects:
            optimized_qs = optimized_qs.prefetch_related(*prefetch_objects)
            logger.debug(f"Applied prefetch_related: {[str(p) for p in prefetch_objects]}")
        
        # Appliquer only() si des champs spécifiques sont demandés
        if optimization_plan['only_fields'] and len(optimization_plan['only_fields']) < 10:
            # Seulement si le nombre de champs est raisonnable
            base_fields = {'id', 'resource_id', 'name', 'description', 'location'}
            fields_to_fetch = base_fields | optimization_plan['only_fields']
            optimized_qs = optimized_qs.only(*fields_to_fetch)
            logger.debug(f"Applied only: {fields_to_fetch}")
        
        return optimized_qs
    
    def _create_optimized_prefetch(self, field_name: str, nested_fields: List[str]) -> Prefetch:
        """
        Crée un objet Prefetch optimisé pour un champ spécifique
        
        Args:
            field_name: Nom du champ à précharger
            nested_fields: Champs imbriqués demandés
            
        Returns:
            Objet Prefetch optimisé
        """
        model_class = self.field_to_model_map[field_name]
        queryset = model_class.objects.all()
        
        # Optimisations spécifiques par modèle
        if field_name == 'opening_hours':
            queryset = queryset.order_by('day_of_week', 'opens')
            if nested_fields:
                # Si seulement certains champs sont demandés, les limiter
                available_fields = {'day_of_week', 'opens', 'closes', 'valid_from', 'valid_through'}
                requested_fields = set(nested_fields) & available_fields
                if requested_fields and len(requested_fields) < len(available_fields):
                    queryset = queryset.only('id', 'resource_id', *requested_fields)
        
        elif field_name == 'prices':
            queryset = queryset.order_by('min_price')
            if nested_fields:
                available_fields = {'min_price', 'max_price', 'currency', 'price_type', 'description'}
                requested_fields = set(nested_fields) & available_fields
                if requested_fields and len(requested_fields) < len(available_fields):
                    queryset = queryset.only('id', 'resource_id', *requested_fields)
        
        elif field_name == 'media':
            queryset = queryset.order_by('-is_main', 'id')
            if nested_fields:
                available_fields = {'url', 'mime_type', 'is_main', 'title', 'credits'}
                requested_fields = set(nested_fields) & available_fields
                if requested_fields and len(requested_fields) < len(available_fields):
                    queryset = queryset.only('id', 'resource_id', *requested_fields)
        
        return Prefetch(field_name, queryset=queryset)


class DataLoader:
    """
    Implémentation d'un DataLoader pour batching des requêtes
    """
    
    def __init__(self, batch_load_fn, max_batch_size: int = 100):
        """
        Initialise le DataLoader
        
        Args:
            batch_load_fn: Fonction qui charge un batch de données
            max_batch_size: Taille maximum du batch
        """
        self.batch_load_fn = batch_load_fn
        self.max_batch_size = max_batch_size
        self._batch = []
        self._promises = {}
        self._batch_scheduled = False
    
    def load(self, key: Any) -> Any:
        """
        Charge une donnée par sa clé (avec batching automatique)
        
        Args:
            key: Clé de la donnée à charger
            
        Returns:
            Donnée chargée
        """
        # Si déjà en cache, retourner immédiatement
        if key in self._promises:
            return self._promises[key]
        
        # Ajouter au batch
        self._batch.append(key)
        
        # Créer une "promesse" pour cette clé
        self._promises[key] = None
        
        # Programmer l'exécution du batch si pas déjà fait
        if not self._batch_scheduled:
            self._schedule_batch()
        
        # Si le batch est plein, l'exécuter immédiatement
        if len(self._batch) >= self.max_batch_size:
            self._execute_batch()
        
        return self._promises[key]
    
    def _schedule_batch(self):
        """Programme l'exécution du batch pour le prochain tick"""
        import asyncio
        
        self._batch_scheduled = True
        
        # En mode synchrone Django, exécuter immédiatement
        self._execute_batch()
    
    def _execute_batch(self):
        """Exécute le batch de chargement"""
        if not self._batch:
            return
        
        try:
            # Charger toutes les données du batch
            results = self.batch_load_fn(self._batch)
            
            # Assigner les résultats aux promesses
            for i, key in enumerate(self._batch):
                if i < len(results):
                    self._promises[key] = results[i]
                else:
                    self._promises[key] = None
            
            # Nettoyer le batch
            self._batch.clear()
            self._batch_scheduled = False
            
        except Exception as e:
            logger.error(f"DataLoader batch execution failed: {e}")
            # En cas d'erreur, marquer toutes les promesses comme None
            for key in self._batch:
                self._promises[key] = None
            self._batch.clear()
            self._batch_scheduled = False


class OptimizedTouristicResourceType(DjangoObjectType):
    """Type GraphQL optimisé pour TouristicResource"""
    
    class Meta:
        model = TouristicResource
        fields = '__all__'
    
    @classmethod
    def get_queryset(cls, queryset, info):
        """
        Optimise le queryset avec analyse automatique de la requête
        
        Args:
            queryset: QuerySet de base
            info: Informations de résolution GraphQL
            
        Returns:
            QuerySet optimisé
        """
        optimizer = QueryOptimizer()
        
        # Analyser la requête pour détecter les optimisations
        optimization_plan = optimizer.analyze_query_info(info)
        
        # Appliquer les optimisations
        optimized_queryset = optimizer.optimize_queryset(queryset, optimization_plan)
        
        # Enregistrer les métriques
        ApplicationMetrics.increment_counter('graphql.query.optimized', 1, {
            'prefetch_count': len(optimization_plan['prefetch_related']),
            'select_related_count': len(optimization_plan['select_related'])
        })
        
        logger.debug(f"GraphQL query optimized with plan: {optimization_plan}")
        
        return optimized_queryset


class GraphQLPerformanceMonitor:
    """Moniteur de performance pour les requêtes GraphQL"""
    
    @staticmethod
    def monitor_resolver(resolver_name: str):
        """
        Décorateur pour monitorer les performances d'un resolver
        
        Args:
            resolver_name: Nom du resolver
        """
        def decorator(func):
            @wraps(func)
            @time_it(f'graphql.resolver.{resolver_name}.duration')
            def wrapper(*args, **kwargs):
                # Compter les appels
                ApplicationMetrics.increment_counter(f'graphql.resolver.{resolver_name}.calls', 1)
                
                try:
                    result = func(*args, **kwargs)
                    
                    # Compter les succès
                    ApplicationMetrics.increment_counter(
                        f'graphql.resolver.{resolver_name}.success', 1
                    )
                    
                    return result
                    
                except Exception as e:
                    # Compter les erreurs
                    ApplicationMetrics.increment_counter(
                        f'graphql.resolver.{resolver_name}.errors', 1
                    )
                    logger.error(f"GraphQL resolver {resolver_name} failed: {e}")
                    raise
            
            return wrapper
        return decorator


# DataLoaders pour les relations communes
class OpeningHoursDataLoader(DataLoader):
    """DataLoader pour les horaires d'ouverture"""
    
    def __init__(self):
        super().__init__(self._batch_load_opening_hours)
    
    def _batch_load_opening_hours(self, resource_ids: List[int]) -> List[List[OpeningHours]]:
        """
        Charge les horaires d'ouverture pour plusieurs ressources
        
        Args:
            resource_ids: IDs des ressources
            
        Returns:
            Liste des horaires par ressource
        """
        # Charger tous les horaires en une seule requête
        opening_hours = OpeningHours.objects.filter(
            resource_id__in=resource_ids
        ).order_by('resource_id', 'day_of_week', 'opens')
        
        # Grouper par resource_id
        grouped_hours = defaultdict(list)
        for oh in opening_hours:
            grouped_hours[oh.resource_id].append(oh)
        
        # Retourner dans l'ordre des resource_ids
        return [grouped_hours.get(resource_id, []) for resource_id in resource_ids]


class PriceDataLoader(DataLoader):
    """DataLoader pour les prix"""
    
    def __init__(self):
        super().__init__(self._batch_load_prices)
    
    def _batch_load_prices(self, resource_ids: List[int]) -> List[List[PriceSpecification]]:
        """
        Charge les prix pour plusieurs ressources
        
        Args:
            resource_ids: IDs des ressources
            
        Returns:
            Liste des prix par ressource
        """
        prices = PriceSpecification.objects.filter(
            resource_id__in=resource_ids
        ).order_by('resource_id', 'min_price')
        
        grouped_prices = defaultdict(list)
        for price in prices:
            grouped_prices[price.resource_id].append(price)
        
        return [grouped_prices.get(resource_id, []) for resource_id in resource_ids]


class MediaDataLoader(DataLoader):
    """DataLoader pour les médias"""
    
    def __init__(self):
        super().__init__(self._batch_load_media)
    
    def _batch_load_media(self, resource_ids: List[int]) -> List[List[MediaRepresentation]]:
        """
        Charge les médias pour plusieurs ressources
        
        Args:
            resource_ids: IDs des ressources
            
        Returns:
            Liste des médias par ressource
        """
        media = MediaRepresentation.objects.filter(
            resource_id__in=resource_ids
        ).order_by('resource_id', '-is_main', 'id')
        
        grouped_media = defaultdict(list)
        for m in media:
            grouped_media[m.resource_id].append(m)
        
        return [grouped_media.get(resource_id, []) for resource_id in resource_ids]


# Instances globales des DataLoaders
opening_hours_loader = OpeningHoursDataLoader()
price_loader = PriceDataLoader()
media_loader = MediaDataLoader()


def get_opening_hours_loader() -> OpeningHoursDataLoader:
    """Retourne le DataLoader pour les horaires d'ouverture"""
    return opening_hours_loader


def get_price_loader() -> PriceDataLoader:
    """Retourne le DataLoader pour les prix"""
    return price_loader


def get_media_loader() -> MediaDataLoader:
    """Retourne le DataLoader pour les médias"""
    return media_loader


class GraphQLQueryComplexityAnalyzer:
    """Analyseur de complexité des requêtes GraphQL"""
    
    def __init__(self, max_complexity: int = 1000):
        """
        Initialise l'analyseur
        
        Args:
            max_complexity: Complexité maximum autorisée
        """
        self.max_complexity = max_complexity
        self.field_complexity = {
            'opening_hours': 2,
            'prices': 2,
            'media': 3,
            'nearby': 5,
            'search': 3,
        }
    
    def analyze_complexity(self, query_ast) -> int:
        """
        Analyse la complexité d'une requête GraphQL
        
        Args:
            query_ast: AST de la requête GraphQL
            
        Returns:
            Score de complexité
        """
        complexity = 0
        
        def visit_field(field, multiplier=1):
            nonlocal complexity
            field_name = field.name.value
            
            # Complexité de base du champ
            field_complexity = self.field_complexity.get(field_name, 1)
            complexity += field_complexity * multiplier
            
            # Analyser les arguments (pagination, filtres)
            if field.arguments:
                for arg in field.arguments:
                    if arg.name.value in ['first', 'last']:
                        # La pagination augmente la complexité
                        try:
                            limit = int(arg.value.value)
                            complexity += limit * 0.1
                        except:
                            complexity += 10  # Pénalité pour limite inconnue
            
            # Analyser récursivement les sous-champs
            if field.selection_set:
                for selection in field.selection_set.selections:
                    if hasattr(selection, 'name'):
                        visit_field(selection, multiplier)
        
        # Parcourir tous les champs de la requête
        for definition in query_ast.definitions:
            if hasattr(definition, 'selection_set'):
                for selection in definition.selection_set.selections:
                    if hasattr(selection, 'name'):
                        visit_field(selection)
        
        return complexity
    
    def validate_complexity(self, query_ast) -> Dict[str, Any]:
        """
        Valide la complexité d'une requête
        
        Args:
            query_ast: AST de la requête GraphQL
            
        Returns:
            Résultat de la validation
        """
        complexity = self.analyze_complexity(query_ast)
        
        is_valid = complexity <= self.max_complexity
        
        return {
            'valid': is_valid,
            'complexity': complexity,
            'max_complexity': self.max_complexity,
            'message': f"Query complexity: {complexity}/{self.max_complexity}" + 
                      ("" if is_valid else " - Too complex!")
        }


# Middleware pour la validation de complexité
class ComplexityValidationMiddleware:
    """Middleware pour valider la complexité des requêtes GraphQL"""
    
    def __init__(self, max_complexity: int = 1000):
        self.analyzer = GraphQLQueryComplexityAnalyzer(max_complexity)
    
    def resolve(self, next_resolver, root, info, **kwargs):
        """
        Middleware de résolution avec validation de complexité
        
        Args:
            next_resolver: Resolver suivant
            root: Objet racine
            info: Informations GraphQL
            **kwargs: Arguments additionnels
            
        Returns:
            Résultat du resolver
        """
        # Valider la complexité seulement pour les requêtes racine
        if root is None and hasattr(info, 'operation'):
            validation_result = self.analyzer.validate_complexity(info.operation)
            
            if not validation_result['valid']:
                ApplicationMetrics.increment_counter('graphql.query.too_complex', 1)
                raise Exception(f"Query too complex: {validation_result['message']}")
            
            # Enregistrer la complexité
            ApplicationMetrics.record_histogram(
                'graphql.query.complexity', 
                validation_result['complexity']
            )
        
        return next_resolver(root, info, **kwargs)