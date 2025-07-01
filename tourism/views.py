from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import Distance
from .models import TouristicResource
from .serializers import TouristicResourceListSerializer, TouristicResourceDetailSerializer

class TouristicResourceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les ressources touristiques"""
    
    queryset = TouristicResource.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'resource_types']
    ordering_fields = ['created_at', 'creation_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TouristicResourceDetailSerializer
        return TouristicResourceListSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Récupération de la langue depuis les paramètres ou headers
        language = self.request.query_params.get('lang', 'fr')
        if language not in ['fr', 'en', 'de', 'es', 'it', 'nl']:
            language = 'fr'
        context['language'] = language
        return context
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """Recherche des ressources à proximité"""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5000)  # rayon en mètres
        
        if not lat or not lng:
            return Response(
                {'error': 'Les paramètres lat et lng sont requis'},
                status=400
            )
        
        try:
            point = Point(float(lng), float(lat), srid=4326)
            radius = int(radius)
        except ValueError:
            return Response(
                {'error': 'Paramètres invalides'},
                status=400
            )
        
        # Filtrage par distance
        queryset = self.get_queryset().filter(
            location__distance_lte=(point, Distance(m=radius))
        ).order_by('location')
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Filtrage par type de ressource"""
        resource_type = request.query_params.get('type')
        
        if not resource_type:
            return Response(
                {'error': 'Le paramètre type est requis'},
                status=400
            )
        
        queryset = self.get_queryset().filter(
            resource_types__contains=[resource_type]
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
