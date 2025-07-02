from django.apps import AppConfig


class TourismConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tourism'
    
    def ready(self):
        """Importer les signaux quand l'app est prête"""
        import tourism.signals  # noqa
