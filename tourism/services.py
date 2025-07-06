import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation
from .metrics import ApplicationMetrics, time_it
from .circuit_breaker import with_circuit_breaker
from .exceptions import (
    TourismBaseException, ValidationError, DataIntegrityError, 
    ImportError, ErrorHandler, ErrorContext
)
from .utils.base_service import ImportServiceBase
from .utils.validation_utils import InputValidator
import logging

logger = logging.getLogger(__name__)

class JsonLdImportService(ImportServiceBase):
    """Service pour importer des données JSON-LD avec gestion avancée des transactions"""
    
    def __init__(self, batch_size: int = 100, max_workers: int = 4):
        super().__init__(batch_size, max_workers)
        
        # Statistiques spécifiques à l'import JSON-LD
        self.stats.update({
            'skipped_duplicates': 0,
            'validation_errors': 0,
            'database_errors': 0,
            'batches_processed': 0,
        })
    
    def import_single_item(self, json_data: Dict[str, Any]) -> Optional[TouristicResource]:
        """
        Implementation of the abstract method from ImportServiceBase.
        
        Imports a single JSON-LD resource.
        """
        return self.import_resource(json_data)
    
    @time_it('import.single_resource.duration')
    @with_circuit_breaker('database')
    def import_resource(self, json_data: Dict[str, Any]) -> Optional[TouristicResource]:
        """
        Importe une ressource JSON-LD avec gestion robuste des erreurs
        
        Args:
            json_data: Données JSON-LD de la ressource
            
        Returns:
            Instance de TouristicResource créée ou None en cas d'erreur
            
        Raises:
            ValidationError: Si les données d'entrée sont invalides
            DataIntegrityError: Si les contraintes de données sont violées
            ImportError: Si l'import échoue pour d'autres raisons
        """
        resource_id = json_data.get('@id', 'unknown')
        
        with ErrorContext('import_resource', resource_id) as ctx:
            # Utiliser la validation centralisée
            validation_result = InputValidator.validate_jsonld_data(json_data)
            if not validation_result['valid']:
                with self._lock:
                    self.stats['validation_errors'] += 1
                raise ValidationError(
                    f"Invalid JSON-LD data for resource {resource_id}",
                    code='INVALID_JSONLD_DATA',
                    details=validation_result['errors']
                )
            
            # Vérifier si la ressource existe déjà
            if self._resource_exists(resource_id):
                if not self._should_update_resource(resource_id, json_data):
                    with self._lock:
                        self.stats['skipped_duplicates'] += 1
                    logger.debug(f"Skipped duplicate resource: {resource_id}")
                    return None
            
            # Transaction atomique pour l'import
            try:
                with transaction.atomic():
                    # Utiliser un savepoint pour rollback partiel
                    sid = transaction.savepoint()
                    
                    try:
                        resource = self._create_or_update_resource(json_data)
                        
                        # Import des données associées
                        self._import_opening_hours(resource, json_data)
                        self._import_prices(resource, json_data)
                        self._import_media(resource, json_data)
                        
                        transaction.savepoint_commit(sid)
                        
                        ApplicationMetrics.increment_counter('import.resources.success', 1)
                        logger.debug(f"Successfully imported resource: {resource_id}")
                        
                        return resource
                        
                    except Exception as e:
                        transaction.savepoint_rollback(sid)
                        with self._lock:
                            self.stats['database_errors'] += 1
                        error_details = {'original_error': str(e), 'resource_id': resource_id}
                        self.record_error(e, error_details)
                        raise ImportError(
                            f"Failed to import resource data for {resource_id}",
                            code='RESOURCE_IMPORT_FAILED',
                            details=error_details
                        ) from e
                        
            except Exception as e:
                if isinstance(e, TourismBaseException):
                    raise
                    
                raise ImportError(
                    f"Database transaction failed for resource {resource_id}",
                    code='DATABASE_TRANSACTION_FAILED',
                    details={'resource_id': resource_id, 'error': str(e)}
                ) from e
    
    def import_batch(self, resources_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Import a batch of JSON-LD resources using the base service functionality.
        
        Args:
            resources_data: List of JSON-LD resource data
            
        Returns:
            Import results dictionary
        """
        return self.import_items(resources_data)
    
    # Removed redundant _validate_json_data method - now using InputValidator.validate_jsonld_data
    
    def _resource_exists(self, resource_id: str) -> bool:
        """Vérifie si une ressource existe déjà"""
        return TouristicResource.objects.filter(resource_id=resource_id).exists()
    
    def _should_update_resource(self, resource_id: str, new_data: Dict[str, Any]) -> bool:
        """
        Détermine si une ressource existante doit être mise à jour
        
        Args:
            resource_id: ID de la ressource
            new_data: Nouvelles données
            
        Returns:
            True si la ressource doit être mise à jour
        """
        try:
            existing_resource = TouristicResource.objects.get(resource_id=resource_id)
            
            # Comparer les dates de modification si disponibles
            new_modified = new_data.get('lastModified') or new_data.get('modificationDate')
            if new_modified and existing_resource.updated_at:
                new_date = self._parse_date(new_modified)
                if new_date and new_date <= existing_resource.updated_at.date():
                    return False
            
            # Toujours mettre à jour si pas de date de modification
            return True
            
        except TouristicResource.DoesNotExist:
            return True
    
    def _create_or_update_resource(self, json_data: Dict[str, Any]) -> TouristicResource:
        """
        Crée ou met à jour une ressource avec données optimisées
        
        Args:
            json_data: Données JSON-LD
            
        Returns:
            Instance de TouristicResource
        """
        # Extraction des données principales
        resource_id = json_data.get('@id', '')
        dc_identifier = json_data.get('dc:identifier', '')
        resource_types = json_data.get('@type', [])
        if not isinstance(resource_types, list):
            resource_types = [resource_types]
        
        # Extraction des noms et descriptions multilingues
        name = self._extract_multilingual_field(json_data.get('rdfs:label', {}))
        description = self._extract_multilingual_field(json_data.get('rdfs:comment', {}))
        
        # Extraction de la localisation
        location = None
        if 'schema:geo' in json_data:
            geo = json_data['schema:geo']
            if 'schema:latitude' in geo and 'schema:longitude' in geo:
                try:
                    location = Point(
                        float(geo['schema:longitude']), 
                        float(geo['schema:latitude'])
                    )
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid coordinates for {resource_id}: {e}")
        
        # Extraction de l'adresse
        address = self._extract_address(json_data)
        
        # Extraction des langues disponibles
        available_languages = list(name.keys()) if name else ['fr']
        
        # Utiliser update_or_create pour optimiser les opérations
        resource, created = TouristicResource.objects.update_or_create(
            resource_id=resource_id,
            defaults={
                'dc_identifier': dc_identifier,
                'resource_types': resource_types,
                'data': json_data,
                'name': name,
                'description': description,
                'location': location,
                'address': address,
                'available_languages': available_languages,
                'creation_date': self._parse_date(json_data.get('creationDate')),
                'updated_at': timezone.now()
            }
        )
        
        ApplicationMetrics.increment_counter(
            'import.resources.created' if created else 'import.resources.updated', 
            1
        )
        
        return resource
    
    # Removed redundant _record_error method - now using inherited record_error from BaseService
    
    # Removed redundant _record_skip method - logic moved inline
    
    def get_import_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive import statistics.
        
        Returns:
            Dictionary with all import statistics
        """
        stats = self.get_stats()
        
        # Add JSON-LD specific statistics
        with self._lock:
            stats.update({
                'skipped_duplicates': self.stats.get('skipped_duplicates', 0),
                'validation_errors': self.stats.get('validation_errors', 0), 
                'database_errors': self.stats.get('database_errors', 0),
                'batches_processed': self.stats.get('batches_processed', 0)
            })
            
        return stats
    
    def _extract_multilingual_field(self, field_data):
        """Extrait un champ multilingue"""
        if isinstance(field_data, dict):
            return field_data
        elif isinstance(field_data, str):
            return {'fr': field_data}
        else:
            return {}
    
    def _extract_address(self, json_data):
        """Extrait l'adresse depuis les données JSON-LD"""
        address_data = json_data.get('schema:address', {})
        if not address_data:
            return None
        
        return {
            'streetAddress': address_data.get('schema:streetAddress', ''),
            'postalCode': address_data.get('schema:postalCode', ''),
            'addressLocality': address_data.get('schema:addressLocality', ''),
            'addressCountry': address_data.get('schema:addressCountry', 'FR'),
        }
    
    def _parse_date(self, date_string):
        """Parse une date au format ISO avec gestion d'erreurs améliorée"""
        if not date_string:
            return None
        
        try:
            # Gérer différents formats de date
            if isinstance(date_string, str):
                # Format avec time : 2024-01-01T00:00:00
                if 'T' in date_string:
                    return datetime.fromisoformat(date_string.split('T')[0]).date()
                # Format simple : 2024-01-01
                elif len(date_string) == 10 and '-' in date_string:
                    return datetime.strptime(date_string, '%Y-%m-%d').date()
                # Autres formats ISO
                else:
                    return datetime.fromisoformat(date_string).date()
            return None
        except (ValueError, AttributeError) as e:
            self.record_error(f"Date parsing error for '{date_string}': {str(e)}")
            return None
    
    def _import_opening_hours(self, resource, json_data):
        """Importe les horaires d'ouverture"""
        opening_hours_data = json_data.get('schema:openingHoursSpecification', [])
        if not isinstance(opening_hours_data, list):
            opening_hours_data = [opening_hours_data]
        
        # Suppression des anciens horaires
        resource.opening_hours.all().delete()
        
        day_mapping = {
            'schema:Monday': 0,
            'schema:Tuesday': 1,
            'schema:Wednesday': 2,
            'schema:Thursday': 3,
            'schema:Friday': 4,
            'schema:Saturday': 5,
            'schema:Sunday': 6,
        }
        
        # Préparer les objets pour bulk_create
        opening_hours_objects = []
        
        for spec in opening_hours_data:
            if not isinstance(spec, dict):
                continue
                
            day_of_week = spec.get('schema:dayOfWeek', {})
            if isinstance(day_of_week, dict):
                day_id = day_of_week.get('@id', '')
                day_num = day_mapping.get(day_id)
                
                if day_num is not None:
                    # Gestion des dates par défaut
                    valid_from = self._parse_date(spec.get('schema:validFrom'))
                    valid_through = self._parse_date(spec.get('schema:validThrough'))
                    
                    # Si les dates ne sont pas fournies, utiliser l'année courante
                    if not valid_from:
                        valid_from = datetime.now().replace(month=1, day=1).date()
                    if not valid_through:
                        valid_through = datetime.now().replace(month=12, day=31).date()
                    
                    opening_hours_objects.append(OpeningHours(
                        resource=resource,
                        day_of_week=day_num,
                        opens=spec.get('schema:opens', '00:00'),
                        closes=spec.get('schema:closes', '23:59'),
                        valid_from=valid_from,
                        valid_through=valid_through,
                    ))
        
        # Bulk create all opening hours
        if opening_hours_objects:
            OpeningHours.objects.bulk_create(opening_hours_objects, batch_size=100)
    
    def _import_prices(self, resource, json_data):
        """Importe les spécifications de prix"""
        offers = json_data.get('hasOffers', {})
        if not offers:
            return
            
        price_specs = offers.get('schema:priceSpecification', [])
        if not isinstance(price_specs, list):
            price_specs = [price_specs]
        
        # Suppression des anciens prix
        resource.prices.all().delete()
        
        # Préparer les objets pour bulk_create
        price_objects = []
        
        for spec in price_specs:
            if not isinstance(spec, dict):
                continue
                
            price_objects.append(PriceSpecification(
                resource=resource,
                min_price=spec.get('schema:minPrice'),
                max_price=spec.get('schema:maxPrice'),
                currency=spec.get('schema:priceCurrency', 'EUR'),
                price_type=spec.get('rdfs:label', {}).get('fr', 'Standard'),
                description=self._extract_multilingual_field(
                    spec.get('additionalInformation', {})
                ),
            ))
        
        # Bulk create all prices
        if price_objects:
            PriceSpecification.objects.bulk_create(price_objects, batch_size=100)
    
    def _import_media(self, resource, json_data):
        """Importe les représentations média avec meilleure gestion des erreurs"""
        representations = []
        
        # Représentation principale
        main_rep = json_data.get('hasMainRepresentation')
        if main_rep and isinstance(main_rep, dict):
            representations.append((main_rep, True))
        
        # Autres représentations
        other_reps = json_data.get('hasRepresentation', [])
        if not isinstance(other_reps, list):
            other_reps = [other_reps] if other_reps else []
        
        for rep in other_reps:
            if rep and isinstance(rep, dict) and rep != main_rep:
                representations.append((rep, False))
        
        # Suppression des anciens médias
        resource.media.all().delete()
        
        # Préparer les objets média pour bulk_create
        media_objects = []
        
        # Import des nouveaux médias
        for rep_data, is_main in representations:
            if not isinstance(rep_data, dict):
                continue
            
            try:
                # Extraction des données avec gestion d'erreurs
                annotation = rep_data.get('ebucore:hasAnnotation', {})
                if isinstance(annotation, list):
                    annotation = annotation[0] if annotation else {}
                
                title = {}
                credits = ''
                
                if isinstance(annotation, dict):
                    title = self._extract_multilingual_field(
                        annotation.get('ebucore:title', {})
                    )
                    credits_list = annotation.get('credits', [])
                    if isinstance(credits_list, list) and credits_list:
                        credits = credits_list[0]
                    elif isinstance(credits_list, str):
                        credits = credits_list
                
                related_resource = rep_data.get('ebucore:hasRelatedResource', {})
                if isinstance(related_resource, dict):
                    url = related_resource.get('ebucore:locator', '')
                    
                    # Extraction du mime type
                    mime_type_data = related_resource.get('ebucore:hasMimeType', {})
                    mime_type = ''
                    if isinstance(mime_type_data, dict):
                        mime_type = mime_type_data.get('@id', '')
                    elif isinstance(mime_type_data, str):
                        mime_type = mime_type_data
                    
                    if url:  # Ajouter seulement si on a une URL
                        media_objects.append(MediaRepresentation(
                            resource=resource,
                            url=url,
                            mime_type=mime_type,
                            is_main=is_main,
                            title=title,
                            credits=credits,
                        ))
                        
            except Exception as e:
                self.record_error(f"Media preparation error: {str(e)}")
        
        # Bulk create all media objects
        if media_objects:
            try:
                MediaRepresentation.objects.bulk_create(media_objects, batch_size=100)
            except Exception as e:
                self.record_error(f"Media bulk import error: {str(e)}")