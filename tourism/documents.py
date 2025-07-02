"""
Documents Elasticsearch pour l'indexation des ressources touristiques
"""
from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from .models import TouristicResource


@registry.register_document
class TouristicResourceDocument(Document):
    """Document Elasticsearch pour les ressources touristiques"""
    
    # Champs de base
    resource_id = fields.KeywordField()
    name = fields.TextField(
        analyzer='standard',
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    description = fields.TextField(analyzer='standard')
    
    # Localisation géographique
    location = fields.GeoPointField()
    city = fields.TextField(
        analyzer='standard',
        fields={'raw': fields.KeywordField()}
    )
    postal_code = fields.KeywordField()
    address = fields.TextField()
    
    # Classification
    resource_types = fields.KeywordField(multi=True)
    categories = fields.KeywordField(multi=True)
    
    # Métadonnées temporelles
    creation_date = fields.DateField()
    last_update = fields.DateField()
    created_at = fields.DateField()
    updated_at = fields.DateField()
    
    # Statut et disponibilité
    is_active = fields.BooleanField()
    
    # Données multilingues (JSON)
    multilingual_data = fields.ObjectField(
        properties={
            'fr': fields.ObjectField(
                properties={
                    'name': fields.TextField(analyzer='french'),
                    'description': fields.TextField(analyzer='french'),
                    'short_description': fields.TextField(analyzer='french'),
                }
            ),
            'en': fields.ObjectField(
                properties={
                    'name': fields.TextField(analyzer='english'),
                    'description': fields.TextField(analyzer='english'),
                    'short_description': fields.TextField(analyzer='english'),
                }
            ),
            'de': fields.ObjectField(
                properties={
                    'name': fields.TextField(analyzer='german'),
                    'description': fields.TextField(analyzer='german'),
                    'short_description': fields.TextField(analyzer='german'),
                }
            ),
            'es': fields.ObjectField(
                properties={
                    'name': fields.TextField(analyzer='spanish'),
                    'description': fields.TextField(analyzer='spanish'),
                    'short_description': fields.TextField(analyzer='spanish'),
                }
            ),
            'it': fields.ObjectField(
                properties={
                    'name': fields.TextField(analyzer='italian'),
                    'description': fields.TextField(analyzer='italian'),
                    'short_description': fields.TextField(analyzer='italian'),
                }
            ),
        }
    )
    
    # Contact et informations pratiques
    contact_info = fields.ObjectField(
        properties={
            'phone': fields.KeywordField(),
            'email': fields.KeywordField(),
            'website': fields.KeywordField(),
        }
    )
    
    # Horaires et disponibilité
    opening_hours = fields.KeywordField(multi=True)
    
    class Index:
        """Configuration de l'index Elasticsearch"""
        name = 'tourism_resources'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'analysis': {
                'analyzer': {
                    'french_custom': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'french_elision',
                            'french_stop',
                            'french_stemmer'
                        ]
                    },
                    'autocomplete': {
                        'type': 'custom',
                        'tokenizer': 'keyword',
                        'filter': ['lowercase', 'asciifolding']
                    }
                },
                'filter': {
                    'french_elision': {
                        'type': 'elision',
                        'articles_case': True,
                        'articles': [
                            'l', 'm', 't', 'qu', 'n', 's',
                            'j', 'd', 'c', 'jusqu', 'quoiqu',
                            'lorsqu', 'puisqu'
                        ]
                    },
                    'french_stop': {
                        'type': 'stop',
                        'stopwords': '_french_'
                    },
                    'french_stemmer': {
                        'type': 'stemmer',
                        'language': 'light_french'
                    }
                }
            }
        }

    class Django:
        """Configuration Django"""
        model = TouristicResource
        fields = []  # Utiliser les champs définis explicitement ci-dessus
        
        # Conditions d'indexation
        queryset_pagination = 50
        
    def prepare_location(self, instance):
        """Prépare les données de géolocalisation pour Elasticsearch"""
        if instance.location:
            return {
                'lat': instance.location.y,
                'lon': instance.location.x
            }
        return None
    
    def prepare_multilingual_data(self, instance):
        """Prépare les données multilingues"""
        return {
            'fr': {
                'name': instance.name.get('fr', ''),
                'description': instance.description.get('fr', ''),
                'short_description': instance.description.get('fr', '')[:200] if instance.description.get('fr') else ''
            },
            'en': {
                'name': instance.name.get('en', ''),
                'description': instance.description.get('en', ''),
                'short_description': instance.description.get('en', '')[:200] if instance.description.get('en') else ''
            },
            'de': {
                'name': instance.name.get('de', ''),
                'description': instance.description.get('de', ''),
                'short_description': instance.description.get('de', '')[:200] if instance.description.get('de') else ''
            },
            'es': {
                'name': instance.name.get('es', ''),
                'description': instance.description.get('es', ''),
                'short_description': instance.description.get('es', '')[:200] if instance.description.get('es') else ''
            },
            'it': {
                'name': instance.name.get('it', ''),
                'description': instance.description.get('it', ''),
                'short_description': instance.description.get('it', '')[:200] if instance.description.get('it') else ''
            }
        }
    
    def prepare_contact_info(self, instance):
        """Prépare les informations de contact"""
        contact = {}
        if hasattr(instance, 'contact_phone') and instance.contact_phone:
            contact['phone'] = instance.contact_phone
        if hasattr(instance, 'contact_email') and instance.contact_email:
            contact['email'] = instance.contact_email
        if hasattr(instance, 'contact_website') and instance.contact_website:
            contact['website'] = instance.contact_website
        return contact if contact else None
    
    def prepare_name(self, instance):
        """Prépare le nom principal pour la recherche"""
        # Utiliser le nom français par défaut
        if instance.name and isinstance(instance.name, dict) and 'fr' in instance.name:
            return instance.name['fr']
        return str(instance.name) if instance.name else ''
    
    def prepare_description(self, instance):
        """Prépare la description principale pour la recherche"""
        # Utiliser la description française par défaut
        if instance.description and isinstance(instance.description, dict) and 'fr' in instance.description:
            return instance.description['fr']
        return str(instance.description) if instance.description else ''
    
    def should_index_object(self, obj):
        """Détermine si l'objet doit être indexé"""
        return obj.is_active