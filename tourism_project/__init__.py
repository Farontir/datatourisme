# Importer Celery pour qu'il soit disponible lors du démarrage Django
from .celery import app as celery_app

__all__ = ('celery_app',)