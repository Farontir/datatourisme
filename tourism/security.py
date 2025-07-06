"""
Système de sécurité avancée pour l'application tourism
"""
import hashlib
import ipaddress
import logging
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, List, Optional, Any, Callable

from django.core.cache import cache
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils import timezone
from django.conf import settings
from django.utils.decorators import method_decorator
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class SecurityError(Exception):
    """Exception de sécurité personnalisée"""
    pass


class RateLimitExceeded(SecurityError):
    """Exception levée quand la limite de taux est dépassée"""
    pass


class SuspiciousActivityDetected(SecurityError):
    """Exception levée quand une activité suspecte est détectée"""
    pass


class AdvancedRateLimit:
    """
    Rate limiting avancé avec support multi-niveaux et détection d'anomalies
    """
    
    def __init__(self, redis_client=None):
        """
        Initialise le rate limiter
        
        Args:
            redis_client: Client Redis optionnel (utilise le cache Django par défaut)
        """
        self.redis_client = redis_client
        self.sliding_window_size = 60  # 1 minute
        self.suspicious_threshold = 100  # Requêtes par minute considérées comme suspectes
        
        # Configuration des limites par défaut
        self.default_limits = {
            'anonymous': {'requests': 100, 'window': 60},  # 100 req/min
            'authenticated': {'requests': 1000, 'window': 60},  # 1000 req/min
            'premium': {'requests': 5000, 'window': 60},  # 5000 req/min
        }
        
        # Limites par endpoint
        self.endpoint_limits = {
            'search': {'requests': 50, 'window': 60},
            'export': {'requests': 10, 'window': 300},  # 10 exports par 5 minutes
            'import': {'requests': 5, 'window': 3600},  # 5 imports par heure
        }
    
    def is_allowed(self, request: HttpRequest, endpoint: str = None) -> Dict[str, Any]:
        """
        Vérifie si la requête est autorisée
        
        Args:
            request: Requête HTTP
            endpoint: Nom de l'endpoint (optionnel)
            
        Returns:
            Dictionnaire avec le statut et les informations
        """
        client_id = self._get_client_id(request)
        user_type = self._get_user_type(request)
        
        # Vérifier les différents niveaux de rate limiting
        checks = [
            ('global', self._check_global_rate_limit(client_id, user_type)),
            ('endpoint', self._check_endpoint_rate_limit(client_id, endpoint) if endpoint else {'allowed': True}),
            ('suspicious', self._check_suspicious_activity(client_id)),
            ('ip_reputation', self._check_ip_reputation(self._get_client_ip(request)))
        ]
        
        result = {
            'allowed': True,
            'client_id': client_id,
            'user_type': user_type,
            'endpoint': endpoint,
            'checks': {}
        }
        
        for check_name, check_result in checks:
            result['checks'][check_name] = check_result
            if not check_result['allowed']:
                result['allowed'] = False
                result['reason'] = check_result.get('reason', f'{check_name} check failed')
                result['retry_after'] = check_result.get('retry_after', 60)
                break
        
        # Enregistrer la requête
        if result['allowed']:
            self._record_request(client_id, user_type, endpoint)
        else:
            self._record_blocked_request(client_id, user_type, endpoint, result['reason'])
        
        return result
    
    def _get_client_id(self, request: HttpRequest) -> str:
        """Génère un identifiant unique pour le client"""
        # Priorité : utilisateur authentifié > API key > IP
        if hasattr(request, 'user') and request.user.is_authenticated:
            return f"user:{request.user.id}"
        
        api_key = request.META.get('HTTP_X_API_KEY')
        if api_key:
            return f"api_key:{hashlib.sha256(api_key.encode()).hexdigest()[:16]}"
        
        ip = self._get_client_ip(request)
        return f"ip:{ip}"
    
    def _get_client_ip(self, request: HttpRequest) -> str:
        """Récupère l'IP réelle du client avec validation de sécurité"""
        # Liste des proxies de confiance (à configurer selon l'environnement)
        trusted_proxies = getattr(settings, 'TRUSTED_PROXIES', ['127.0.0.1', '::1'])
        
        # Récupérer l'IP directe d'abord
        remote_addr = request.META.get('REMOTE_ADDR', '127.0.0.1')
        
        # Si l'IP directe n'est pas un proxy de confiance, l'utiliser
        if remote_addr not in trusted_proxies:
            try:
                ipaddress.ip_address(remote_addr)
                return remote_addr
            except ValueError:
                return '127.0.0.1'
        
        # Si c'est un proxy de confiance, vérifier les headers forwarded
        headers = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CF_CONNECTING_IP',  # Cloudflare
        ]
        
        for header in headers:
            header_value = request.META.get(header)
            if header_value:
                # Prendre la première IP si plusieurs (X-Forwarded-For)
                ip = header_value.split(',')[0].strip()
                
                # Validation stricte de l'IP
                if self._is_valid_client_ip(ip):
                    return ip
        
        # Fallback sur l'IP directe
        return remote_addr
    
    def _is_valid_client_ip(self, ip_str: str) -> bool:
        """Valide qu'une IP est acceptable comme IP client"""
        try:
            ip = ipaddress.ip_address(ip_str)
            
            # Rejeter les IP privées/locales dans les headers forwarded (sauf config explicite)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                return False
            
            # Rejeter les IP multicast et réservées
            if ip.is_multicast or ip.is_reserved:
                return False
            
            # Rejeter les IP non globales IPv6
            if isinstance(ip, ipaddress.IPv6Address) and not ip.is_global:
                return False
            
            return True
            
        except ValueError:
            return False
    
    def _get_user_type(self, request: HttpRequest) -> str:
        """Détermine le type d'utilisateur"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            if hasattr(request.user, 'subscription') and request.user.subscription == 'premium':
                return 'premium'
            return 'authenticated'
        return 'anonymous'
    
    def _check_global_rate_limit(self, client_id: str, user_type: str) -> Dict[str, Any]:
        """Vérifie la limite globale de taux"""
        limits = self.default_limits[user_type]
        
        # Clé Redis pour le compteur
        key = f"rate_limit:global:{client_id}"
        window = limits['window']
        max_requests = limits['requests']
        
        # Implémentation sliding window avec Redis ou cache Django
        current_requests = self._get_request_count(key, window)
        
        if current_requests >= max_requests:
            return {
                'allowed': False,
                'reason': f'Global rate limit exceeded: {current_requests}/{max_requests} requests in {window}s',
                'retry_after': window,
                'current_count': current_requests,
                'limit': max_requests
            }
        
        return {
            'allowed': True,
            'current_count': current_requests,
            'limit': max_requests,
            'window': window
        }
    
    def _check_endpoint_rate_limit(self, client_id: str, endpoint: str) -> Dict[str, Any]:
        """Vérifie la limite de taux par endpoint"""
        if endpoint not in self.endpoint_limits:
            return {'allowed': True}
        
        limits = self.endpoint_limits[endpoint]
        key = f"rate_limit:endpoint:{endpoint}:{client_id}"
        window = limits['window']
        max_requests = limits['requests']
        
        current_requests = self._get_request_count(key, window)
        
        if current_requests >= max_requests:
            return {
                'allowed': False,
                'reason': f'Endpoint rate limit exceeded for {endpoint}: {current_requests}/{max_requests} requests in {window}s',
                'retry_after': window,
                'current_count': current_requests,
                'limit': max_requests
            }
        
        return {
            'allowed': True,
            'current_count': current_requests,
            'limit': max_requests,
            'window': window
        }
    
    def _check_suspicious_activity(self, client_id: str) -> Dict[str, Any]:
        """Détecte les activités suspectes"""
        # Vérifier le nombre de requêtes sur une période plus longue
        key = f"suspicious:check:{client_id}"
        window = 300  # 5 minutes
        
        current_requests = self._get_request_count(key, window)
        
        if current_requests > self.suspicious_threshold:
            # Augmenter le score de suspicion
            suspicion_key = f"suspicion:score:{client_id}"
            suspicion_score = cache.get(suspicion_key, 0) + 1
            cache.set(suspicion_key, suspicion_score, 3600)  # 1 heure
            
            if suspicion_score > 3:  # Bloqué après 3 détections
                return {
                    'allowed': False,
                    'reason': f'Suspicious activity detected: {current_requests} requests in {window}s (score: {suspicion_score})',
                    'retry_after': 3600,  # 1 heure
                    'suspicion_score': suspicion_score
                }
        
        return {'allowed': True}
    
    def _check_ip_reputation(self, ip: str) -> Dict[str, Any]:
        """Vérifie la réputation de l'IP"""
        # Liste noire d'IPs
        blacklist_key = f"ip:blacklist:{ip}"
        if cache.get(blacklist_key):
            return {
                'allowed': False,
                'reason': f'IP {ip} is blacklisted',
                'retry_after': 86400  # 24 heures
            }
        
        # Vérifier si l'IP a été signalée récemment
        reports_key = f"ip:reports:{ip}"
        reports = cache.get(reports_key, 0)
        
        if reports > 5:  # Plus de 5 signalements
            # Mettre en liste noire temporairement
            cache.set(blacklist_key, True, 3600)  # 1 heure
            return {
                'allowed': False,
                'reason': f'IP {ip} temporarily blacklisted due to reports',
                'retry_after': 3600
            }
        
        return {'allowed': True}
    
    def _get_request_count(self, key: str, window: int) -> int:
        """Récupère le nombre de requêtes dans la fenêtre de temps"""
        try:
            if self.redis_client:
                # Implémentation Redis avec sliding window
                now = time.time()
                pipeline = self.redis_client.pipeline()
                
                # Supprimer les entrées expirées
                pipeline.zremrangebyscore(key, 0, now - window)
                # Ajouter l'entrée actuelle
                pipeline.zadd(key, {str(now): now})
                # Compter les entrées dans la fenêtre
                pipeline.zcard(key)
                # Définir l'expiration
                pipeline.expire(key, window)
                
                results = pipeline.execute()
                return results[2]  # Résultat de zcard
            else:
                # Fallback avec cache Django (moins précis)
                cache_key = f"rate_limit_count:{key}"
                count = cache.get(cache_key, 0)
                cache.set(cache_key, count + 1, window)
                return count
                
        except Exception as e:
            logger.error(f"Error getting request count: {e}")
            return 0
    
    def _record_request(self, client_id: str, user_type: str, endpoint: str):
        """Enregistre une requête autorisée"""
        timestamp = timezone.now()
        
        # Enregistrer dans les métriques
        from .metrics import ApplicationMetrics
        ApplicationMetrics.increment_counter('security.requests.allowed', 1, {
            'user_type': user_type,
            'endpoint': endpoint or 'unknown'
        })
        
        logger.debug(f"Request allowed for {client_id} ({user_type}) on {endpoint}")
    
    def _record_blocked_request(self, client_id: str, user_type: str, endpoint: str, reason: str):
        """Enregistre une requête bloquée"""
        timestamp = timezone.now()
        
        # Enregistrer dans les métriques
        from .metrics import ApplicationMetrics
        ApplicationMetrics.increment_counter('security.requests.blocked', 1, {
            'user_type': user_type,
            'endpoint': endpoint or 'unknown',
            'reason': reason.split(':')[0]  # Premier mot de la raison
        })
        
        logger.warning(f"Request blocked for {client_id} ({user_type}) on {endpoint}: {reason}")
    
    def report_malicious_ip(self, ip: str, reason: str = "malicious_activity"):
        """Signale une IP comme malveillante"""
        reports_key = f"ip:reports:{ip}"
        current_reports = cache.get(reports_key, 0)
        cache.set(reports_key, current_reports + 1, 86400)  # 24 heures
        
        logger.warning(f"IP {ip} reported for {reason}. Total reports: {current_reports + 1}")


class InputValidator:
    """Validateur d'entrées pour prévenir les injections et attaques"""
    
    # Patterns dangereux - optimized to prevent ReDoS
    SQL_INJECTION_PATTERNS = [
        r"\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b",
        r"(--|#|/\*|\*/)",
        r"\b(or|and)\s+\d{1,10}\s*=\s*\d{1,10}",  # Limit digit repetition
        r"\b(or|and)\s+['\"][^'\"]{0,100}['\"]",  # Limit string content
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]{0,100}>",  # Limit repetition to prevent ReDoS
        r"</script>",
        r"javascript:",
        r"on\w{1,20}\s*=",  # Limit word repetition
        r"<iframe[^>]{0,100}>",
        r"<object[^>]{0,100}>",
        r"<embed[^>]{0,100}>",
    ]
    
    LDAP_INJECTION_PATTERNS = [
        r"[()&|!]",
        r"\*",
        r"[\x00-\x1f\x7f-\xff]",
    ]
    
    def __init__(self):
        self.compiled_patterns = {
            'sql': [re.compile(pattern, re.IGNORECASE) for pattern in self.SQL_INJECTION_PATTERNS],
            'xss': [re.compile(pattern, re.IGNORECASE) for pattern in self.XSS_PATTERNS],
            'ldap': [re.compile(pattern) for pattern in self.LDAP_INJECTION_PATTERNS],
        }
    
    def validate_input(self, value: str, check_types: List[str] = None) -> Dict[str, Any]:
        """
        Valide une entrée contre différents types d'attaques
        
        Args:
            value: Valeur à valider
            check_types: Types de vérifications ('sql', 'xss', 'ldap')
            
        Returns:
            Dictionnaire avec le résultat de la validation
        """
        if check_types is None:
            check_types = ['sql', 'xss']
        
        result = {
            'valid': True,
            'threats_detected': [],
            'sanitized_value': value
        }
        
        if not isinstance(value, str):
            return result
        
        for check_type in check_types:
            if check_type in self.compiled_patterns:
                for pattern in self.compiled_patterns[check_type]:
                    if pattern.search(value):
                        result['valid'] = False
                        result['threats_detected'].append({
                            'type': check_type,
                            'pattern': pattern.pattern,
                            'message': f'Potential {check_type.upper()} injection detected'
                        })
        
        # Sanitiser la valeur si des menaces sont détectées
        if not result['valid']:
            result['sanitized_value'] = self._sanitize_input(value)
        
        return result
    
    def _sanitize_input(self, value: str) -> str:
        """Sanitise une entrée en supprimant les caractères dangereux"""
        # Supprimer les balises HTML
        value = re.sub(r'<[^>]+>', '', value)
        
        # Supprimer les caractères de contrôle
        value = re.sub(r'[\x00-\x1f\x7f-\xff]', '', value)
        
        # Supprimer les commentaires SQL
        value = re.sub(r'--.*$', '', value, flags=re.MULTILINE)
        value = re.sub(r'/\*.*?\*/', '', value, flags=re.DOTALL)
        
        return value.strip()
    
    def validate_request_data(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valide toutes les données d'une requête
        
        Args:
            request_data: Données de la requête
            
        Returns:
            Dictionnaire avec les résultats de validation
        """
        results = {
            'valid': True,
            'field_results': {},
            'threats_detected': []
        }
        
        for field_name, field_value in request_data.items():
            if isinstance(field_value, str):
                field_result = self.validate_input(field_value)
                results['field_results'][field_name] = field_result
                
                if not field_result['valid']:
                    results['valid'] = False
                    results['threats_detected'].extend(field_result['threats_detected'])
        
        return results


class SecurityMiddleware:
    """Middleware de sécurité pour Django"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limiter = AdvancedRateLimit()
        self.validator = InputValidator()
    
    def __call__(self, request):
        # Vérifications pré-traitement
        security_check = self._pre_process_security(request)
        
        if not security_check['allowed']:
            return self._create_rate_limit_response(security_check)
        
        # Traitement normal
        response = self.get_response(request)
        
        # Ajout des headers de sécurité
        response = self._add_security_headers(response)
        
        return response
    
    def _pre_process_security(self, request) -> Dict[str, Any]:
        """Vérifications de sécurité avant traitement"""
        # Rate limiting
        endpoint = self._extract_endpoint(request)
        rate_check = self.rate_limiter.is_allowed(request, endpoint)
        
        if not rate_check['allowed']:
            return rate_check
        
        # Validation des paramètres
        if request.method in ['POST', 'PUT', 'PATCH']:
            validation_result = self._validate_request_body(request)
            if not validation_result['valid']:
                return {
                    'allowed': False,
                    'reason': 'Malicious input detected',
                    'threats': validation_result['threats_detected']
                }
        
        return {'allowed': True}
    
    def _extract_endpoint(self, request) -> str:
        """Extrait le nom de l'endpoint depuis l'URL"""
        path = request.path.strip('/')
        if path.startswith('api/v1/'):
            parts = path.split('/')
            if len(parts) >= 3:
                return parts[2]  # resources, search, etc.
        return 'unknown'
    
    def _validate_request_body(self, request) -> Dict[str, Any]:
        """Valide le corps de la requête"""
        try:
            # Pour JSON
            if hasattr(request, 'data') and request.data:
                return self.validator.validate_request_data(request.data)
            
            # Pour les paramètres POST
            if request.POST:
                return self.validator.validate_request_data(dict(request.POST))
            
            return {'valid': True, 'threats_detected': []}
            
        except Exception as e:
            logger.error(f"Error validating request body: {e}")
            return {'valid': True, 'threats_detected': []}
    
    def _create_rate_limit_response(self, security_check: Dict[str, Any]) -> JsonResponse:
        """Crée une réponse de rate limiting"""
        response_data = {
            'error': 'Rate limit exceeded',
            'message': security_check.get('reason', 'Too many requests'),
            'retry_after': security_check.get('retry_after', 60)
        }
        
        response = JsonResponse(response_data, status=429)
        response['Retry-After'] = str(security_check.get('retry_after', 60))
        response['X-RateLimit-Limit'] = str(security_check.get('checks', {}).get('global', {}).get('limit', 'unknown'))
        response['X-RateLimit-Remaining'] = '0'
        
        return response
    
    def _add_security_headers(self, response: HttpResponse) -> HttpResponse:
        """Ajoute les headers de sécurité"""
        # Headers de sécurité de base
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # CSP (Content Security Policy)
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        response['Content-Security-Policy'] = csp
        
        # HSTS (si HTTPS)
        if getattr(settings, 'SECURE_SSL_REDIRECT', False):
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


# Décorateurs pour protéger les vues
def rate_limit(requests_per_minute: int = 60, per_user: bool = True):
    """
    Décorateur pour appliquer un rate limiting à une vue
    
    Args:
        requests_per_minute: Nombre de requêtes par minute autorisées
        per_user: Si True, applique par utilisateur, sinon par IP
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            rate_limiter = AdvancedRateLimit()
            check_result = rate_limiter.is_allowed(request)
            
            if not check_result['allowed']:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': check_result.get('reason')
                }, status=429)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def validate_input(*validation_types):
    """
    Décorateur pour valider les entrées d'une vue
    
    Args:
        *validation_types: Types de validation ('sql', 'xss', 'ldap')
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            validator = InputValidator()
            
            # Valider les paramètres GET
            for key, value in request.GET.items():
                if isinstance(value, str):
                    result = validator.validate_input(value, list(validation_types))
                    if not result['valid']:
                        return JsonResponse({
                            'error': 'Invalid input detected',
                            'field': key,
                            'threats': result['threats_detected']
                        }, status=400)
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator


# Fonction utilitaire pour signaler des IPs malveillantes
def report_malicious_activity(request: HttpRequest, reason: str = "suspicious_behavior"):
    """
    Signale une activité malveillante
    
    Args:
        request: Requête HTTP
        reason: Raison du signalement
    """
    rate_limiter = AdvancedRateLimit()
    client_ip = rate_limiter._get_client_ip(request)
    rate_limiter.report_malicious_ip(client_ip, reason)
    
    logger.warning(f"Malicious activity reported from {client_ip}: {reason}")