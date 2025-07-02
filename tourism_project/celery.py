"""
Configuration Celery pour l'application tourism
"""
import os
from celery import Celery
from django.conf import settings

# Définir le module de configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tourism_project.settings')

# Créer l'instance Celery
app = Celery('tourism_project')

# Configuration depuis les settings Django
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodécouverte des tâches dans les applications Django
app.autodiscover_tasks()

# Configuration supplémentaire
app.conf.update(
    # Timezone
    timezone='Europe/Paris',
    enable_utc=True,
    
    # Configuration des tâches
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    result_expires=3600,
    
    # Configuration des workers
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    
    # Configuration beat (tâches périodiques)
    beat_schedule={
        'update-cache-statistics': {
            'task': 'tourism.tasks.update_cache_statistics',
            'schedule': 300.0,  # Toutes les 5 minutes
        },
        'cleanup-expired-data': {
            'task': 'tourism.tasks.cleanup_expired_data',
            'schedule': 3600.0,  # Toutes les heures
        },
        'reindex-elasticsearch-incremental': {
            'task': 'tourism.tasks.reindex_elasticsearch_incremental',
            'schedule': 1800.0,  # Toutes les 30 minutes
        },
        'generate-daily-analytics': {
            'task': 'tourism.tasks.generate_daily_analytics',
            'schedule': {
                'hour': 2,
                'minute': 0
            },  # Tous les jours à 2h du matin
        },
    },
)


@app.task(bind=True)
def debug_task(self):
    """Tâche de debug pour tester Celery"""
    print(f'Request: {self.request!r}')
    return 'Debug task completed'