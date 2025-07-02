from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tourism.views import TouristicResourceViewSet
from tourism.search_views import SearchViewSet

router = DefaultRouter()
router.register(r'resources', TouristicResourceViewSet, basename='touristic-resource')
router.register(r'search', SearchViewSet, basename='search')

urlpatterns = [
    path('v1/', include(router.urls)),
]