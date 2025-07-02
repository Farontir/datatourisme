"""
Tâches asynchrones Celery pour l'application tourism
"""
from celery import shared_task
from django.core.cache import cache
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def update_cache_statistics(self):
    """
    Met à jour les statistiques du cache Redis
    """
    try:
        from .cache import CacheService
        
        logger.info("Début mise à jour statistiques cache")
        
        # Récupérer les statistiques
        stats = CacheService.get_stats()
        
        if stats:
            # Stocker les statistiques avec timestamp
            stats_with_time = {
                'timestamp': timezone.now().isoformat(),
                'stats': stats
            }
            
            # Clé pour les statistiques historiques
            cache_key = f"tourism:cache_stats:{timezone.now().strftime('%Y%m%d_%H%M')}"
            cache.set(cache_key, stats_with_time, 86400)  # 24h
            
            # Mettre à jour les stats actuelles
            cache.set('tourism:cache_stats:current', stats_with_time, 86400)
            
            logger.info(f"Statistiques cache mises à jour: {stats}")
            return {
                'success': True,
                'stats': stats,
                'timestamp': stats_with_time['timestamp']
            }
        else:
            logger.warning("Impossible de récupérer les statistiques cache")
            return {'success': False, 'error': 'No stats available'}
            
    except Exception as exc:
        logger.error(f"Erreur mise à jour stats cache: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@shared_task(bind=True, max_retries=2)
def cleanup_expired_data(self):
    """
    Nettoie les données expirées du cache et de la base de données
    """
    try:
        logger.info("Début nettoyage données expirées")
        
        cleaned_items = 0
        
        # Nettoyer les anciens logs de statistiques
        try:
            from django.core.cache import cache
            
            # Supprimer les statistiques de cache plus anciennes que 7 jours
            cutoff_date = timezone.now() - timedelta(days=7)
            pattern = f"tourism:cache_stats:*"
            
            # Note: cette partie nécessite django-redis
            try:
                deleted = cache.delete_pattern(pattern)
                cleaned_items += deleted
                logger.info(f"Supprimé {deleted} anciennes statistiques cache")
            except Exception as e:
                logger.warning(f"Impossible de nettoyer les stats cache: {e}")
            
        except Exception as e:
            logger.error(f"Erreur nettoyage cache: {e}")
        
        # Nettoyer les ressources inactives anciennes (exemple)
        try:
            from .models import TouristicResource
            
            # Exemple: marquer comme inactives les ressources non mises à jour depuis 1 an
            cutoff_date = timezone.now() - timedelta(days=365)
            old_resources = TouristicResource.objects.filter(
                last_update__lt=cutoff_date,
                is_active=True
            )
            
            count = old_resources.count()
            if count > 0:
                logger.info(f"Trouvé {count} ressources anciennes, nettoyage non automatique")
                # Note: ne pas supprimer automatiquement, juste logger
            
        except Exception as e:
            logger.error(f"Erreur vérification ressources anciennes: {e}")
        
        logger.info(f"Nettoyage terminé: {cleaned_items} éléments supprimés")
        return {
            'success': True,
            'cleaned_items': cleaned_items,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur nettoyage données: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)


@shared_task(bind=True, max_retries=2)
def reindex_elasticsearch_incremental(self):
    """
    Réindexation incrémentale d'Elasticsearch pour les ressources modifiées
    """
    try:
        from .models import TouristicResource
        from .search import SearchIndexService
        
        logger.info("Début réindexation incrémentale Elasticsearch")
        
        # Récupérer les ressources modifiées dans les dernières 30 minutes
        cutoff_time = timezone.now() - timedelta(minutes=30)
        
        modified_resources = TouristicResource.objects.filter(
            updated_at__gte=cutoff_time
        )
        
        indexed_count = 0
        errors = []
        
        for resource in modified_resources:
            try:
                if resource.is_active:
                    # Indexer la ressource
                    result = SearchIndexService.index_resource(resource.resource_id)
                    if result['success']:
                        indexed_count += 1
                    else:
                        errors.append(f"Resource {resource.resource_id}: {result['error']}")
                else:
                    # Supprimer de l'index si inactive
                    result = SearchIndexService.delete_from_index(resource.resource_id)
                    if result['success']:
                        indexed_count += 1
                    else:
                        errors.append(f"Delete {resource.resource_id}: {result['error']}")
                        
            except Exception as e:
                error_msg = f"Erreur indexation ressource {resource.resource_id}: {e}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        logger.info(f"Réindexation incrémentale terminée: {indexed_count} ressources traitées")
        
        if errors:
            logger.warning(f"Erreurs lors de la réindexation: {errors}")
        
        return {
            'success': True,
            'indexed_count': indexed_count,
            'errors': errors,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur réindexation Elasticsearch: {exc}")
        raise self.retry(exc=exc, countdown=600, max_retries=2)


@shared_task(bind=True, max_retries=1)
def generate_daily_analytics(self):
    """
    Génère les analytics quotidiennes
    """
    try:
        from .models import TouristicResource
        from .cache import AnalyticsCacheService
        
        logger.info("Début génération analytics quotidiennes")
        
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        
        # Calculer diverses métriques
        analytics_data = {}
        
        # Nombre total de ressources actives
        total_active = TouristicResource.objects.filter(is_active=True).count()
        analytics_data['total_active_resources'] = total_active
        
        # Nouvelles ressources créées hier
        new_yesterday = TouristicResource.objects.filter(
            created_at__date=yesterday,
            is_active=True
        ).count()
        analytics_data['new_resources_yesterday'] = new_yesterday
        
        # Ressources modifiées hier
        modified_yesterday = TouristicResource.objects.filter(
            updated_at__date=yesterday,
            is_active=True
        ).count()
        analytics_data['modified_resources_yesterday'] = modified_yesterday
        
        # Répartition par type
        type_distribution = {}
        resources_with_types = TouristicResource.objects.filter(
            is_active=True,
            resource_types__isnull=False
        )
        
        for resource in resources_with_types:
            for resource_type in resource.resource_types or []:
                type_distribution[resource_type] = type_distribution.get(resource_type, 0) + 1
        
        analytics_data['type_distribution'] = type_distribution
        
        # Répartition par ville (top 10)
        from django.db.models import Count
        city_distribution = dict(
            TouristicResource.objects.filter(is_active=True)
            .values('city')
            .annotate(count=Count('city'))
            .order_by('-count')[:10]
            .values_list('city', 'count')
        )
        analytics_data['top_cities'] = city_distribution
        
        # Métadonnées
        analytics_data['generated_at'] = timezone.now().isoformat()
        analytics_data['date'] = yesterday.isoformat()
        
        # Stocker en cache
        cache_key = f"daily_analytics_{yesterday.strftime('%Y%m%d')}"
        AnalyticsCacheService.set_analytics('daily', yesterday.isoformat(), analytics_data)
        
        # Stocker aussi la dernière version
        AnalyticsCacheService.set_analytics('daily', 'latest', analytics_data)
        
        logger.info(f"Analytics quotidiennes générées pour {yesterday}")
        logger.info(f"Résumé: {total_active} ressources actives, {new_yesterday} nouvelles, {modified_yesterday} modifiées")
        
        return {
            'success': True,
            'date': yesterday.isoformat(),
            'summary': analytics_data,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur génération analytics: {exc}")
        raise self.retry(exc=exc, countdown=3600, max_retries=1)


@shared_task(bind=True, max_retries=3)
def export_resources_to_file(self, export_format='csv', filters=None, user_email=None):
    """
    Exporte les ressources vers un fichier et envoie par email
    
    Args:
        export_format: Format d'export ('csv', 'xlsx', 'json')
        filters: Filtres à appliquer
        user_email: Email de l'utilisateur pour l'envoi
    """
    try:
        from .models import TouristicResource
        from .export import ExportService
        
        logger.info(f"Début export ressources format {export_format}")
        
        # Construire le queryset avec filtres
        queryset = TouristicResource.objects.filter(is_active=True)
        
        if filters:
            if filters.get('resource_types'):
                queryset = queryset.filter(resource_types__overlap=filters['resource_types'])
            if filters.get('cities'):
                queryset = queryset.filter(city__in=filters['cities'])
            if filters.get('date_from'):
                queryset = queryset.filter(creation_date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(creation_date__lte=filters['date_to'])
        
        # Effectuer l'export
        export_service = ExportService()
        
        if export_format == 'csv':
            file_path, file_size = export_service.export_to_csv(queryset)
        elif export_format == 'xlsx':
            file_path, file_size = export_service.export_to_excel(queryset)
        elif export_format == 'json':
            file_path, file_size = export_service.export_to_json(queryset)
        else:
            raise ValueError(f"Format d'export non supporté: {export_format}")
        
        logger.info(f"Export terminé: {file_path} ({file_size} bytes)")
        
        # Envoyer par email si demandé
        if user_email:
            subject = f"Export des ressources touristiques ({export_format.upper()})"
            message = f"""
            Votre export des ressources touristiques est prêt.
            
            Format: {export_format.upper()}
            Nombre de ressources: {queryset.count()}
            Taille du fichier: {file_size} bytes
            Généré le: {timezone.now().strftime('%d/%m/%Y à %H:%M')}
            
            Le fichier est disponible pour téléchargement.
            """
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user_email],
                    fail_silently=False,
                )
                logger.info(f"Email d'export envoyé à {user_email}")
            except Exception as e:
                logger.error(f"Erreur envoi email: {e}")
        
        return {
            'success': True,
            'file_path': file_path,
            'file_size': file_size,
            'record_count': queryset.count(),
            'format': export_format,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur export ressources: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=3)


@shared_task(bind=True, max_retries=2) 
def send_notification_email(self, recipient_email, subject, message, message_html=None):
    """
    Envoie un email de notification de manière asynchrone
    
    Args:
        recipient_email: Email du destinataire
        subject: Sujet de l'email
        message: Message texte
        message_html: Message HTML (optionnel)
    """
    try:
        logger.info(f"Envoi email à {recipient_email}: {subject}")
        
        send_mail(
            subject=subject,
            message=message,
            html_message=message_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        
        logger.info(f"Email envoyé avec succès à {recipient_email}")
        return {
            'success': True,
            'recipient': recipient_email,
            'subject': subject,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Erreur envoi email à {recipient_email}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=2)


@shared_task
def process_resource_update(resource_id, changes):
    """
    Traite la mise à jour d'une ressource de manière asynchrone
    
    Args:
        resource_id: ID de la ressource
        changes: Dictionnaire des changements effectués
    """
    try:
        from .models import TouristicResource
        from .cache import ResourceCacheService
        from .search import SearchIndexService
        
        logger.info(f"Traitement mise à jour ressource {resource_id}")
        
        # Invalider le cache
        ResourceCacheService.invalidate_resource(resource_id)
        
        # Réindexer dans Elasticsearch
        SearchIndexService.index_resource(resource_id)
        
        # Log de l'activité
        logger.info(f"Ressource {resource_id} mise à jour: {changes}")
        
        return {
            'success': True,
            'resource_id': resource_id,
            'changes': changes,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erreur traitement mise à jour ressource {resource_id}: {e}")
        return {
            'success': False,
            'resource_id': resource_id,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }