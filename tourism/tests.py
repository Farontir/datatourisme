from django.test import TestCase
from django.contrib.gis.geos import Point
from rest_framework.test import APITestCase
from rest_framework import status
from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation
from .services import JsonLdImportService
import json
from datetime import date, time

class TouristicResourceModelTest(TestCase):
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id="test-001",
            dc_identifier="TEST001",
            resource_types=["PlaceOfInterest", "SportsAndLeisurePlace"],
            name={"fr": "Test Resource", "en": "Test Resource"},
            description={"fr": "Description test", "en": "Test description"},
            location=Point(1.9325, 45.0937),
            available_languages=["fr", "en"]
        )
    
    def test_str_representation(self):
        self.assertEqual(str(self.resource), "Test Resource")
    
    def test_multilingual_fields(self):
        self.assertEqual(self.resource.get_name('fr'), "Test Resource")
        self.assertEqual(self.resource.get_name('en'), "Test Resource")
        # Test fallback vers fr
        self.assertEqual(self.resource.get_name('de'), "Test Resource")
    
    def test_location_coordinates(self):
        self.assertAlmostEqual(self.resource.location.x, 1.9325)
        self.assertAlmostEqual(self.resource.location.y, 45.0937)

class OpeningHoursModelTest(TestCase):
    def setUp(self):
        self.resource = TouristicResource.objects.create(
            resource_id="test-001",
            dc_identifier="TEST001",
            resource_types=["PlaceOfInterest"],
            name={"fr": "Test"}
        )
        
        self.opening_hours = OpeningHours.objects.create(
            resource=self.resource,
            day_of_week=0,  # Lundi
            opens=time(9, 0),
            closes=time(18, 0),
            valid_from=date(2024, 1, 1),
            valid_through=date(2024, 12, 31)
        )
    
    def test_str_representation(self):
        expected = "Test - Lundi 09:00:00-18:00:00"
        self.assertEqual(str(self.opening_hours), expected)
    
    def test_day_display(self):
        self.assertEqual(self.opening_hours.get_day_of_week_display(), "Lundi")

class JsonLdImportServiceTest(TestCase):
    def setUp(self):
        self.service = JsonLdImportService()
        self.sample_data = {
            "@id": "https://example.com/resource/123",
            "dc:identifier": "TEST123",
            "@type": ["PlaceOfInterest", "SportsAndLeisurePlace"],
            "rdfs:label": {
                "fr": "Test Resource",
                "en": "Test Resource"
            },
            "rdfs:comment": {
                "fr": "Description test complète avec beaucoup de détails",
                "en": "Complete test description with lots of details"
            },
            "schema:geo": {
                "schema:latitude": 45.0937,
                "schema:longitude": 1.9325
            },
            "creationDate": "2024-01-15"
        }
    
    def test_import_basic_resource(self):
        resource = self.service.import_resource(self.sample_data)
        
        self.assertEqual(resource.resource_id, "https://example.com/resource/123")
        self.assertEqual(resource.dc_identifier, "TEST123")
        self.assertEqual(len(resource.resource_types), 2)
        self.assertIn("PlaceOfInterest", resource.resource_types)
        self.assertIsNotNone(resource.location)
        self.assertAlmostEqual(resource.location.x, 1.9325)
        self.assertAlmostEqual(resource.location.y, 45.0937)
        self.assertEqual(resource.creation_date, date(2024, 1, 15))
    
    def test_import_with_opening_hours(self):
        self.sample_data['schema:openingHoursSpecification'] = [{
            "schema:dayOfWeek": {"@id": "schema:Monday"},
            "schema:opens": "09:00:00",
            "schema:closes": "18:00:00",
            "schema:validFrom": "2024-01-01",
            "schema:validThrough": "2024-12-31"
        }]
        
        resource = self.service.import_resource(self.sample_data)
        self.assertEqual(resource.opening_hours.count(), 1)
        
        opening_hours = resource.opening_hours.first()
        self.assertEqual(opening_hours.day_of_week, 0)
        self.assertEqual(opening_hours.opens, time(9, 0))
        self.assertEqual(opening_hours.closes, time(18, 0))
    
    def test_import_with_prices(self):
        self.sample_data['hasOffers'] = {
            "schema:priceSpecification": [{
                "schema:minPrice": 20,
                "schema:maxPrice": 50,
                "schema:priceCurrency": "EUR",
                "rdfs:label": {"fr": "Tarif standard"},
                "additionalInformation": {
                    "fr": "Prix par personne",
                    "en": "Price per person"
                }
            }]
        }
        
        resource = self.service.import_resource(self.sample_data)
        self.assertEqual(resource.prices.count(), 1)
        
        price = resource.prices.first()
        self.assertEqual(price.min_price, 20)
        self.assertEqual(price.max_price, 50)
        self.assertEqual(price.currency, "EUR")
    
    def test_import_idempotent(self):
        """Test que l'import est idempotent"""
        # Premier import
        resource1 = self.service.import_resource(self.sample_data)
        resource1_id = resource1.id
        
        # Deuxième import avec les mêmes données
        resource2 = self.service.import_resource(self.sample_data)
        
        # Vérifier que c'est la même ressource
        self.assertEqual(resource1_id, resource2.id)
        self.assertEqual(TouristicResource.objects.count(), 1)

class TouristicResourceAPITest(APITestCase):
    def setUp(self):
        # Créer des ressources de test
        self.resource1 = TouristicResource.objects.create(
            resource_id="test-001",
            dc_identifier="TEST001",
            resource_types=["PlaceOfInterest"],
            name={"fr": "Ressource 1", "en": "Resource 1"},
            description={"fr": "Description 1", "en": "Description 1"},
            location=Point(1.0, 45.0),
            available_languages=["fr", "en"]
        )
        
        self.resource2 = TouristicResource.objects.create(
            resource_id="test-002",
            dc_identifier="TEST002",
            resource_types=["SportsAndLeisurePlace"],
            name={"fr": "Ressource 2", "en": "Resource 2"},
            description={"fr": "Description 2", "en": "Description 2"},
            location=Point(1.1, 45.1),
            available_languages=["fr", "en"]
        )
        
        # Créer une ressource inactive
        self.inactive_resource = TouristicResource.objects.create(
            resource_id="test-003",
            dc_identifier="TEST003",
            resource_types=["PlaceOfInterest"],
            name={"fr": "Ressource Inactive"},
            is_active=False
        )
    
    def test_list_resources(self):
        response = self.client.get('/api/v1/resources/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Seulement les ressources actives
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_resource(self):
        response = self.client.get(f'/api/v1/resources/{self.resource1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['resource_id'], 'test-001')
        self.assertIn('opening_hours', response.data)
        self.assertIn('prices', response.data)
        self.assertIn('media', response.data)
    
    def test_multilingual_api(self):
        # Test français (défaut) - utiliser un tri pour avoir un résultat prévisible
        response = self.client.get('/api/v1/resources/?ordering=resource_id')
        self.assertEqual(response.data['results'][0]['name'], 'Ressource 1')
        
        # Test anglais
        response = self.client.get('/api/v1/resources/?lang=en&ordering=resource_id')
        self.assertEqual(response.data['results'][0]['name'], 'Resource 1')
        
        # Test avec langue non supportée (doit retourner français)
        response = self.client.get('/api/v1/resources/?lang=xx&ordering=resource_id')
        self.assertEqual(response.data['results'][0]['name'], 'Ressource 1')
    
    def test_nearby_search(self):
        # Test recherche à proximité
        response = self.client.get('/api/v1/resources/nearby/', {
            'lat': 45.05,
            'lng': 1.05,
            'radius': 10000  # 10km
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Les deux ressources sont dans le rayon
        self.assertEqual(len(response.data['results']), 2)
        
        # Test avec un rayon plus petit
        response = self.client.get('/api/v1/resources/nearby/', {
            'lat': 45.0,
            'lng': 1.0,
            'radius': 1000  # 1km
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Seulement resource1 est assez proche
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['resource_id'], 'test-001')
    
    def test_nearby_search_errors(self):
        # Test sans coordonnées
        response = self.client.get('/api/v1/resources/nearby/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test avec coordonnées invalides
        response = self.client.get('/api/v1/resources/nearby/', {
            'lat': 'invalid',
            'lng': 'invalid'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_filter_by_type(self):
        response = self.client.get('/api/v1/resources/by_type/', {
            'type': 'PlaceOfInterest'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['resource_id'], 'test-001')
        
        # Test avec type non existant
        response = self.client.get('/api/v1/resources/by_type/', {
            'type': 'NonExistentType'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_search_functionality(self):
        # Test recherche par nom
        response = self.client.get('/api/v1/resources/?search=Ressource%201')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['resource_id'], 'test-001')
    
    def test_pagination(self):
        # Créer plus de ressources pour tester la pagination
        for i in range(25):
            TouristicResource.objects.create(
                resource_id=f"test-page-{i}",
                dc_identifier=f"PAGE{i}",
                resource_types=["PlaceOfInterest"],
                name={"fr": f"Resource Page {i}"}
            )
        
        response = self.client.get('/api/v1/resources/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 20)  # PAGE_SIZE = 20
        self.assertIn('next', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 27)  # 2 originales + 25 nouvelles
