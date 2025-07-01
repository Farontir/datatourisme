from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.indexes import GinIndex
from django.utils import timezone

class TouristicResource(models.Model):
    """Modèle principal pour stocker les ressources touristiques"""
    
    # Identifiants
    resource_id = models.CharField(
        max_length=255, 
        unique=True, 
        db_index=True,
        help_text="ID unique de la ressource (@id dans JSON-LD)"
    )
    dc_identifier = models.CharField(
        max_length=255, 
        db_index=True,
        help_text="Identifiant Dublin Core"
    )
    
    # Type de ressource
    resource_types = ArrayField(
        models.CharField(max_length=100),
        default=list,
        help_text="Types de la ressource (@type dans JSON-LD)"
    )
    
    # Données JSON-LD complètes
    data = models.JSONField(
        default=dict,
        help_text="Données JSON-LD complètes"
    )
    
    # Champs multilingues dénormalisés
    name = models.JSONField(
        default=dict,
        help_text="Nom en plusieurs langues"
    )
    description = models.JSONField(
        default=dict,
        help_text="Description en plusieurs langues"
    )
    
    # Localisation
    location = models.PointField(
        geography=True, 
        srid=4326,
        null=True,
        blank=True,
        help_text="Coordonnées GPS"
    )
    address = models.JSONField(
        default=dict,
        null=True,
        blank=True,
        help_text="Adresse complète"
    )
    
    # Métadonnées
    creation_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date de création de la ressource"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date d'import dans la base"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Dernière modification"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Ressource active/visible"
    )
    
    # Langues disponibles
    available_languages = ArrayField(
        models.CharField(max_length=2),
        default=list,
        help_text="Langues disponibles pour cette ressource"
    )
    
    class Meta:
        db_table = 'touristic_resources'
        verbose_name = 'Ressource touristique'
        verbose_name_plural = 'Ressources touristiques'
        indexes = [
            models.Index(fields=['resource_types', 'is_active']),
            models.Index(fields=['creation_date']),
            GinIndex(fields=['data'], name='data_gin_idx'),
            GinIndex(fields=['name'], name='name_gin_idx'),
            GinIndex(fields=['description'], name='description_gin_idx'),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return self.get_name('fr') or self.resource_id
    
    def get_name(self, language='fr'):
        """Retourne le nom dans la langue demandée"""
        return self.name.get(language, self.name.get('fr', ''))
    
    def get_description(self, language='fr'):
        """Retourne la description dans la langue demandée"""
        return self.description.get(language, self.description.get('fr', ''))

class OpeningHours(models.Model):
    """Horaires d'ouverture"""
    
    DAYS_OF_WEEK = [
        (0, 'Lundi'),
        (1, 'Mardi'),
        (2, 'Mercredi'),
        (3, 'Jeudi'),
        (4, 'Vendredi'),
        (5, 'Samedi'),
        (6, 'Dimanche'),
    ]
    
    resource = models.ForeignKey(
        TouristicResource, 
        on_delete=models.CASCADE,
        related_name='opening_hours'
    )
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    opens = models.TimeField()
    closes = models.TimeField()
    valid_from = models.DateField()
    valid_through = models.DateField()
    
    class Meta:
        db_table = 'opening_hours'
        verbose_name = 'Horaire d\'ouverture'
        verbose_name_plural = 'Horaires d\'ouverture'
        ordering = ['day_of_week', 'opens']
        indexes = [
            models.Index(fields=['resource', 'valid_from', 'valid_through']),
        ]
    
    def __str__(self):
        return f"{self.resource} - {self.get_day_of_week_display()} {self.opens}-{self.closes}"

class PriceSpecification(models.Model):
    """Spécifications de prix"""
    
    resource = models.ForeignKey(
        TouristicResource,
        on_delete=models.CASCADE,
        related_name='prices'
    )
    min_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True
    )
    max_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True
    )
    currency = models.CharField(max_length=3, default='EUR')
    price_type = models.CharField(max_length=100)
    description = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'price_specifications'
        verbose_name = 'Spécification de prix'
        verbose_name_plural = 'Spécifications de prix'
    
    def __str__(self):
        return f"{self.resource} - {self.price_type}: {self.min_price}-{self.max_price} {self.currency}"

class MediaRepresentation(models.Model):
    """Représentations média (images, etc.)"""
    
    resource = models.ForeignKey(
        TouristicResource,
        on_delete=models.CASCADE,
        related_name='media'
    )
    url = models.URLField(max_length=500)
    title = models.JSONField(default=dict)
    mime_type = models.CharField(max_length=100)
    is_main = models.BooleanField(default=False)
    credits = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'media_representations'
        verbose_name = 'Média'
        verbose_name_plural = 'Médias'
