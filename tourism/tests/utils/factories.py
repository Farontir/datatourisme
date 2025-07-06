"""
Test data factories for creating consistent test objects.

This module provides factory methods for creating test data
that eliminate duplication across test files.
"""
import random
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.contrib.gis.geos import Point
from django.utils import timezone
from tourism.models import (
    TouristicResource, Category, ResourceType, 
    OpeningHours, PriceSpecification, MediaRepresentation
)


class TouristicResourceFactory:
    """Factory for creating TouristicResource test instances."""
    
    @staticmethod
    def create(
        resource_id=None,
        dc_identifier=None,
        resource_types=None,
        name=None,
        description=None,
        location=None,
        **kwargs
    ):
        """Create a TouristicResource with sensible defaults."""
        # Generate defaults
        if resource_id is None:
            resource_id = f"test-resource-{random.randint(1000, 9999)}"
            
        if dc_identifier is None:
            dc_identifier = f"test-{random.randint(1000, 9999)}"
            
        if resource_types is None:
            resource_types = ['TestType']
            
        if name is None:
            name = {'fr': f'Test Resource {random.randint(1, 100)}'}
            
        if description is None:
            description = {'fr': 'Test description for resource'}
            
        if location is None:
            # Default to somewhere in France
            lat = round(random.uniform(42.0, 51.0), 6)
            lng = round(random.uniform(-5.0, 8.0), 6)
            location = Point(lng, lat)
        
        # Build JSON-LD data
        data = {
            '@id': resource_id,
            '@type': resource_types,
            'rdfs:label': name,
            'rdfs:comment': description,
            'schema:geo': {
                'schema:latitude': location.y,
                'schema:longitude': location.x
            } if location else None
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        defaults = {
            'resource_id': resource_id,
            'dc_identifier': dc_identifier,
            'resource_types': resource_types,
            'data': data,
            'name': name,
            'description': description,
            'location': location,
            'available_languages': ['fr'],
            'creation_date': timezone.now().date(),
            **kwargs
        }
        
        return TouristicResource.objects.create(**defaults)
    
    @staticmethod
    def create_batch(count=5, **kwargs):
        """Create multiple TouristicResource instances."""
        return [
            TouristicResourceFactory.create(**kwargs)
            for _ in range(count)
        ]
    
    @staticmethod
    def create_jsonld_data(
        resource_id=None,
        resource_type='TestType',
        name=None,
        description=None,
        location=None,
        **extra_fields
    ):
        """Create JSON-LD data dict for testing imports."""
        if resource_id is None:
            resource_id = f"test-jsonld-{random.randint(1000, 9999)}"
            
        if name is None:
            name = {'fr': f'JSON-LD Resource {random.randint(1, 100)}'}
            
        if description is None:
            description = {'fr': 'JSON-LD test description'}
        
        data = {
            '@id': resource_id,
            '@type': [resource_type],
            'dc:identifier': f"dc-{resource_id}",
            'rdfs:label': name,
            'rdfs:comment': description,
            'creationDate': datetime.now().isoformat(),
            **extra_fields
        }
        
        # Add location if provided
        if location:
            if isinstance(location, Point):
                lat, lng = location.y, location.x
            else:
                lat, lng = location
                
            data['schema:geo'] = {
                'schema:latitude': lat,
                'schema:longitude': lng
            }
        
        return data


class CategoryFactory:
    """Factory for creating Category test instances."""
    
    @staticmethod
    def create(name=None, dc_identifier=None, **kwargs):
        """Create a Category with sensible defaults."""
        if name is None:
            name = {'fr': f'Test Category {random.randint(1, 100)}'}
            
        if dc_identifier is None:
            dc_identifier = f"test-category-{random.randint(1000, 9999)}"
        
        defaults = {
            'name': name,
            'dc_identifier': dc_identifier,
            **kwargs
        }
        
        return Category.objects.create(**defaults)


class ResourceTypeFactory:
    """Factory for creating ResourceType test instances."""
    
    @staticmethod
    def create(name=None, dc_identifier=None, **kwargs):
        """Create a ResourceType with sensible defaults."""
        if name is None:
            name = {'fr': f'Test Type {random.randint(1, 100)}'}
            
        if dc_identifier is None:
            dc_identifier = f"test-type-{random.randint(1000, 9999)}"
        
        defaults = {
            'name': name,
            'dc_identifier': dc_identifier,
            **kwargs
        }
        
        return ResourceType.objects.create(**defaults)


class OpeningHoursFactory:
    """Factory for creating OpeningHours test instances."""
    
    @staticmethod
    def create(resource=None, day_of_week=None, **kwargs):
        """Create OpeningHours with sensible defaults."""
        if resource is None:
            resource = TouristicResourceFactory.create()
            
        if day_of_week is None:
            day_of_week = random.randint(0, 6)  # Monday to Sunday
        
        defaults = {
            'resource': resource,
            'day_of_week': day_of_week,
            'opens': '09:00',
            'closes': '18:00',
            'valid_from': date.today(),
            'valid_through': date.today() + timedelta(days=365),
            **kwargs
        }
        
        return OpeningHours.objects.create(**defaults)
    
    @staticmethod
    def create_week_schedule(resource=None):
        """Create a full week schedule for a resource."""
        if resource is None:
            resource = TouristicResourceFactory.create()
            
        schedule = []
        for day in range(7):  # Monday to Sunday
            schedule.append(
                OpeningHoursFactory.create(
                    resource=resource,
                    day_of_week=day
                )
            )
        return schedule


class PriceSpecificationFactory:
    """Factory for creating PriceSpecification test instances."""
    
    @staticmethod
    def create(resource=None, **kwargs):
        """Create PriceSpecification with sensible defaults."""
        if resource is None:
            resource = TouristicResourceFactory.create()
        
        defaults = {
            'resource': resource,
            'min_price': Decimal('10.00'),
            'max_price': Decimal('50.00'),
            'currency': 'EUR',
            'price_type': 'Standard',
            'description': {'fr': 'Prix standard'},
            **kwargs
        }
        
        return PriceSpecification.objects.create(**defaults)


class MediaRepresentationFactory:
    """Factory for creating MediaRepresentation test instances."""
    
    @staticmethod
    def create(resource=None, is_main=False, **kwargs):
        """Create MediaRepresentation with sensible defaults."""
        if resource is None:
            resource = TouristicResourceFactory.create()
        
        defaults = {
            'resource': resource,
            'url': f'https://example.com/media/{random.randint(1000, 9999)}.jpg',
            'mime_type': 'image/jpeg',
            'is_main': is_main,
            'title': {'fr': f'Image {random.randint(1, 100)}'},
            'credits': 'Test credits',
            **kwargs
        }
        
        return MediaRepresentation.objects.create(**defaults)


class TestDataBuilder:
    """Builder for creating complex test scenarios."""
    
    def __init__(self):
        self.resources = []
        self.categories = []
        self.resource_types = []
    
    def with_categories(self, count=3):
        """Add categories to the test data."""
        self.categories = [
            CategoryFactory.create() for _ in range(count)
        ]
        return self
    
    def with_resource_types(self, count=3):
        """Add resource types to the test data."""
        self.resource_types = [
            ResourceTypeFactory.create() for _ in range(count)
        ]
        return self
    
    def with_resources(self, count=5, with_media=True, with_prices=True, with_hours=True):
        """Add resources with related data."""
        self.resources = []
        
        for _ in range(count):
            resource = TouristicResourceFactory.create()
            
            if with_media:
                # Add main image and 2 additional images
                MediaRepresentationFactory.create(resource=resource, is_main=True)
                MediaRepresentationFactory.create(resource=resource, is_main=False)
                MediaRepresentationFactory.create(resource=resource, is_main=False)
            
            if with_prices:
                # Add multiple price specifications
                PriceSpecificationFactory.create(
                    resource=resource,
                    price_type='Adult',
                    min_price=Decimal('15.00'),
                    max_price=Decimal('25.00')
                )
                PriceSpecificationFactory.create(
                    resource=resource,
                    price_type='Child',
                    min_price=Decimal('8.00'),
                    max_price=Decimal('12.00')
                )
            
            if with_hours:
                # Add opening hours for the week
                OpeningHoursFactory.create_week_schedule(resource)
            
            self.resources.append(resource)
        
        return self
    
    def with_geographic_distribution(self, center_lat=46.0, center_lng=2.0, radius_km=100):
        """Distribute resources geographically around a center point."""
        for resource in self.resources:
            # Random point within radius
            angle = random.uniform(0, 2 * 3.14159)
            distance = random.uniform(0, radius_km)
            
            # Approximate lat/lng offset (very rough)
            lat_offset = (distance * 0.009) * random.uniform(-1, 1)
            lng_offset = (distance * 0.009) * random.uniform(-1, 1)
            
            new_location = Point(
                center_lng + lng_offset,
                center_lat + lat_offset
            )
            
            resource.location = new_location
            resource.save()
        
        return self
    
    def build(self):
        """Return the built test data."""
        return {
            'resources': self.resources,
            'categories': self.categories,
            'resource_types': self.resource_types
        }