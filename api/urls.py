from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tourism.views import TouristicResourceViewSet

router = DefaultRouter()
router.register(r'resources', TouristicResourceViewSet, basename='touristic-resource')

urlpatterns = [
    path('v1/', include(router.urls)),
]