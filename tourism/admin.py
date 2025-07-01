from django.contrib import admin
from django.contrib.gis.admin import OSMGeoAdmin
from .models import TouristicResource, OpeningHours, PriceSpecification, MediaRepresentation

class OpeningHoursInline(admin.TabularInline):
    model = OpeningHours
    extra = 0

class PriceSpecificationInline(admin.TabularInline):
    model = PriceSpecification
    extra = 0

class MediaRepresentationInline(admin.TabularInline):
    model = MediaRepresentation
    extra = 0

@admin.register(TouristicResource)
class TouristicResourceAdmin(OSMGeoAdmin):
    list_display = ['resource_id', 'get_name_fr', 'get_types', 'is_active', 'created_at']
    list_filter = ['is_active', 'resource_types', 'available_languages']
    search_fields = ['resource_id', 'dc_identifier', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [OpeningHoursInline, PriceSpecificationInline, MediaRepresentationInline]
    
    def get_name_fr(self, obj):
        return obj.get_name('fr')
    get_name_fr.short_description = 'Nom (FR)'
    
    def get_types(self, obj):
        return ', '.join(obj.resource_types[:3])
    get_types.short_description = 'Types'
