from rest_framework import serializers
from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation

class OpeningHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)
    
    class Meta:
        model = OpeningHours
        fields = ['day_of_week', 'day_name', 'opens', 'closes', 'valid_from', 'valid_through']

class PriceSpecificationSerializer(serializers.ModelSerializer):
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = PriceSpecification
        fields = ['min_price', 'max_price', 'currency', 'price_type', 'description']
    
    def get_description(self, obj):
        language = self.context.get('language', 'fr')
        return obj.description.get(language, obj.description.get('fr', ''))

class MediaRepresentationSerializer(serializers.ModelSerializer):
    title = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaRepresentation
        fields = ['url', 'title', 'mime_type', 'is_main', 'credits']
    
    def get_title(self, obj):
        language = self.context.get('language', 'fr')
        return obj.title.get(language, obj.title.get('fr', ''))

class TouristicResourceListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste (version allégée)"""
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    main_image = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    
    class Meta:
        model = TouristicResource
        fields = [
            'id', 'resource_id', 'resource_types', 'name', 
            'description', 'location', 'main_image', 'price_range'
        ]
    
    def get_name(self, obj):
        language = self.context.get('language', 'fr')
        return obj.get_name(language)
    
    def get_description(self, obj):
        language = self.context.get('language', 'fr')
        desc = obj.get_description(language)
        # Tronquer la description pour la liste
        return desc[:200] + '...' if len(desc) > 200 else desc
    
    def get_main_image(self, obj):
        main_media = obj.media.filter(is_main=True).first()
        if main_media:
            return main_media.url
        return None
    
    def get_price_range(self, obj):
        prices = obj.prices.all()
        if not prices:
            return None
        
        min_prices = [p.min_price for p in prices if p.min_price]
        if min_prices:
            return {
                'min': min(min_prices),
                'currency': prices[0].currency
            }
        return None

class TouristicResourceDetailSerializer(serializers.ModelSerializer):
    """Serializer détaillé avec toutes les relations"""
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    opening_hours = OpeningHoursSerializer(many=True, read_only=True)
    prices = PriceSpecificationSerializer(many=True, read_only=True)
    media = MediaRepresentationSerializer(many=True, read_only=True)
    
    class Meta:
        model = TouristicResource
        fields = [
            'id', 'resource_id', 'dc_identifier', 'resource_types',
            'name', 'description', 'location', 'address',
            'available_languages', 'creation_date',
            'opening_hours', 'prices', 'media',
            'created_at', 'updated_at'
        ]
    
    def get_name(self, obj):
        language = self.context.get('language', 'fr')
        return obj.get_name(language)
    
    def get_description(self, obj):
        language = self.context.get('language', 'fr')
        return obj.get_description(language)