import json
from datetime import datetime
from django.contrib.gis.geos import Point
from django.db import transaction
from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation

class JsonLdImportService:
    """Service pour importer des données JSON-LD"""
    
    def __init__(self):
        self.errors = []
        self.imported_count = 0
    
    @transaction.atomic
    def import_resource(self, json_data):
        """Importe une ressource JSON-LD"""
        try:
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
                    location = Point(
                        float(geo['schema:longitude']), 
                        float(geo['schema:latitude'])
                    )
            
            # Extraction des langues disponibles
            available_languages = list(name.keys())
            
            # Création ou mise à jour de la ressource
            resource, created = TouristicResource.objects.update_or_create(
                resource_id=resource_id,
                defaults={
                    'dc_identifier': dc_identifier,
                    'resource_types': resource_types,
                    'data': json_data,
                    'name': name,
                    'description': description,
                    'location': location,
                    'available_languages': available_languages,
                    'creation_date': self._parse_date(json_data.get('creationDate')),
                }
            )
            
            # Import des horaires d'ouverture
            self._import_opening_hours(resource, json_data)
            
            # Import des prix
            self._import_prices(resource, json_data)
            
            # Import des médias
            self._import_media(resource, json_data)
            
            self.imported_count += 1
            return resource
            
        except Exception as e:
            self.errors.append(f"Erreur import {resource_id}: {str(e)}")
            raise
    
    def _extract_multilingual_field(self, field_data):
        """Extrait un champ multilingue"""
        if isinstance(field_data, dict):
            return field_data
        elif isinstance(field_data, str):
            return {'fr': field_data}
        else:
            return {}
    
    def _parse_date(self, date_string):
        """Parse une date au format ISO"""
        if not date_string:
            return None
        try:
            return datetime.fromisoformat(date_string).date()
        except:
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
        
        for spec in opening_hours_data:
            if not isinstance(spec, dict):
                continue
                
            day_of_week = spec.get('schema:dayOfWeek', {})
            if isinstance(day_of_week, dict):
                day_id = day_of_week.get('@id', '')
                day_num = day_mapping.get(day_id)
                
                if day_num is not None:
                    OpeningHours.objects.create(
                        resource=resource,
                        day_of_week=day_num,
                        opens=spec.get('schema:opens', '00:00'),
                        closes=spec.get('schema:closes', '23:59'),
                        valid_from=self._parse_date(spec.get('schema:validFrom')),
                        valid_through=self._parse_date(spec.get('schema:validThrough')),
                    )
    
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
        
        for spec in price_specs:
            if not isinstance(spec, dict):
                continue
                
            PriceSpecification.objects.create(
                resource=resource,
                min_price=spec.get('schema:minPrice'),
                max_price=spec.get('schema:maxPrice'),
                currency=spec.get('schema:priceCurrency', 'EUR'),
                price_type=spec.get('rdfs:label', {}).get('fr', 'Standard'),
                description=self._extract_multilingual_field(
                    spec.get('additionalInformation', {})
                ),
            )
    
    def _import_media(self, resource, json_data):
        """Importe les représentations média"""
        representations = []
        
        # Représentation principale
        main_rep = json_data.get('hasMainRepresentation', {})
        if main_rep:
            representations.append((main_rep, True))
        
        # Autres représentations
        other_reps = json_data.get('hasRepresentation', [])
        if not isinstance(other_reps, list):
            other_reps = [other_reps]
        
        for rep in other_reps:
            if rep and rep != main_rep:
                representations.append((rep, False))
        
        # Suppression des anciens médias
        resource.media.all().delete()
        
        # Import des nouveaux médias
        for rep_data, is_main in representations:
            if not isinstance(rep_data, dict):
                continue
                
            related_resource = rep_data.get('ebucore:hasRelatedResource', {})
            if isinstance(related_resource, dict):
                MediaRepresentation.objects.create(
                    resource=resource,
                    url=related_resource.get('ebucore:locator', ''),
                    mime_type=related_resource.get('ebucore:hasMimeType', {}).get('@id', ''),
                    is_main=is_main,
                    title=self._extract_multilingual_field(
                        rep_data.get('ebucore:hasAnnotation', {}).get('ebucore:title', {})
                    ),
                    credits=rep_data.get('ebucore:hasAnnotation', {}).get('credits', [''])[0],
                )