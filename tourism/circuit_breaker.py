"""
Implémentation du pattern Circuit Breaker pour la tolérance aux pannes
"""
import time
import threading
from functools import wraps
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """États possibles du circuit breaker"""
    CLOSED = "closed"      # Circuit fermé - trafic normal
    OPEN = "open"          # Circuit ouvert - pas de trafic
    HALF_OPEN = "half_open"  # Circuit semi-ouvert - test de récupération


class CircuitBreakerError(Exception):
    """Exception levée quand le circuit breaker est ouvert"""
    pass


class CircuitBreaker:
    """
    Implémentation du pattern Circuit Breaker
    
    Protège contre les services externes défaillants en stoppant
    les appels quand un seuil d'erreurs est atteint.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "default"
    ):
        """
        Initialise le circuit breaker
        
        Args:
            failure_threshold: Nombre d'échecs avant ouverture
            recovery_timeout: Temps d'attente avant test de récupération (secondes)
            expected_exception: Type d'exception qui compte comme échec
            name: Nom du circuit breaker pour les logs
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED
        self.success_count = 0
        self.total_calls = 0
        
        # Thread safety
        self._lock = threading.Lock()
        
        logger.info(f"Circuit breaker '{name}' initialized: threshold={failure_threshold}, timeout={recovery_timeout}s")
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Exécute une fonction protégée par le circuit breaker
        
        Args:
            func: Fonction à exécuter
            *args: Arguments positionnels
            **kwargs: Arguments nommés
            
        Returns:
            Résultat de la fonction
            
        Raises:
            CircuitBreakerError: Si le circuit est ouvert
        """
        with self._lock:
            self.total_calls += 1
            
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker '{self.name}' moved to HALF_OPEN state")
                else:
                    logger.warning(f"Circuit breaker '{self.name}' is OPEN - blocking call")
                    raise CircuitBreakerError(f"Circuit breaker '{self.name}' is OPEN")
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
                
            except self.expected_exception as e:
                self._on_failure()
                raise
            except Exception as e:
                # Exception non attendue - ne pas compter comme échec
                logger.error(f"Unexpected error in circuit breaker '{self.name}': {e}")
                raise
    
    def _should_attempt_reset(self) -> bool:
        """Vérifie si on doit tenter une récupération"""
        if self.last_failure_time is None:
            return True
        
        time_since_failure = datetime.now() - self.last_failure_time
        return time_since_failure.total_seconds() >= self.recovery_timeout
    
    def _on_success(self):
        """Gère le succès d'un appel"""
        self.success_count += 1
        
        if self.state == CircuitState.HALF_OPEN:
            # Récupération réussie
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            logger.info(f"Circuit breaker '{self.name}' recovered - moved to CLOSED state")
        elif self.state == CircuitState.CLOSED:
            # Tout va bien, réinitialiser le compteur d'échecs
            self.failure_count = 0
    
    def _on_failure(self):
        """Gère l'échec d'un appel"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.state == CircuitState.HALF_OPEN:
            # Échec pendant la récupération - retour à OPEN
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker '{self.name}' failed during recovery - moved to OPEN state")
        elif self.failure_count >= self.failure_threshold:
            # Seuil d'échecs atteint - ouvrir le circuit
            self.state = CircuitState.OPEN
            logger.error(f"Circuit breaker '{self.name}' opened after {self.failure_count} failures")
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du circuit breaker"""
        with self._lock:
            return {
                'name': self.name,
                'state': self.state.value,
                'failure_count': self.failure_count,
                'success_count': self.success_count,
                'total_calls': self.total_calls,
                'success_rate': (self.success_count / self.total_calls * 100) if self.total_calls > 0 else 0,
                'last_failure_time': self.last_failure_time.isoformat() if self.last_failure_time else None,
                'failure_threshold': self.failure_threshold,
                'recovery_timeout': self.recovery_timeout
            }
    
    def reset(self):
        """Réinitialise le circuit breaker"""
        with self._lock:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.last_failure_time = None
            logger.info(f"Circuit breaker '{self.name}' manually reset")
    
    def force_open(self):
        """Force l'ouverture du circuit breaker"""
        with self._lock:
            self.state = CircuitState.OPEN
            self.last_failure_time = datetime.now()
            logger.warning(f"Circuit breaker '{self.name}' manually opened")


class CircuitBreakerManager:
    """Gestionnaire centralisé des circuit breakers"""
    
    _instances: Dict[str, CircuitBreaker] = {}
    _lock = threading.Lock()
    
    @classmethod
    def get_circuit_breaker(
        cls,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ) -> CircuitBreaker:
        """
        Récupère ou crée un circuit breaker
        
        Args:
            name: Nom unique du circuit breaker
            failure_threshold: Seuil d'échecs
            recovery_timeout: Timeout de récupération
            expected_exception: Type d'exception attendue
            
        Returns:
            Instance du circuit breaker
        """
        with cls._lock:
            if name not in cls._instances:
                cls._instances[name] = CircuitBreaker(
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    expected_exception=expected_exception,
                    name=name
                )
            return cls._instances[name]
    
    @classmethod
    def get_all_stats(cls) -> Dict[str, Dict[str, Any]]:
        """Retourne les statistiques de tous les circuit breakers"""
        with cls._lock:
            return {name: cb.get_stats() for name, cb in cls._instances.items()}
    
    @classmethod
    def reset_all(cls):
        """Réinitialise tous les circuit breakers"""
        with cls._lock:
            for cb in cls._instances.values():
                cb.reset()
            logger.info("All circuit breakers reset")


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception
):
    """
    Décorateur pour protéger une fonction avec un circuit breaker
    
    Args:
        name: Nom du circuit breaker
        failure_threshold: Seuil d'échecs
        recovery_timeout: Timeout de récupération
        expected_exception: Type d'exception attendue
    """
    def decorator(func: Callable) -> Callable:
        cb = CircuitBreakerManager.get_circuit_breaker(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception
        )
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return cb.call(func, *args, **kwargs)
        
        # Ajouter les méthodes du circuit breaker à la fonction
        wrapper.get_stats = cb.get_stats
        wrapper.reset = cb.reset
        wrapper.force_open = cb.force_open
        
        return wrapper
    
    return decorator


# Circuit breakers prédéfinis pour les services externes
class ServiceCircuitBreakers:
    """Circuit breakers spécialisés pour les services de l'application"""
    
    @staticmethod
    def redis_circuit_breaker():
        """Circuit breaker pour Redis"""
        return CircuitBreakerManager.get_circuit_breaker(
            name="redis",
            failure_threshold=3,
            recovery_timeout=30,
            expected_exception=Exception
        )
    
    @staticmethod
    def elasticsearch_circuit_breaker():
        """Circuit breaker pour Elasticsearch"""
        return CircuitBreakerManager.get_circuit_breaker(
            name="elasticsearch",
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=Exception
        )
    
    @staticmethod
    def database_circuit_breaker():
        """Circuit breaker pour la base de données"""
        return CircuitBreakerManager.get_circuit_breaker(
            name="database",
            failure_threshold=10,
            recovery_timeout=30,
            expected_exception=Exception
        )


# Fonctions utilitaires pour les services
def with_circuit_breaker(service_name: str, failure_threshold: int = 5):
    """
    Décorateur simplifié pour protéger les méthodes de service
    
    Args:
        service_name: Nom du service
        failure_threshold: Seuil d'échecs
    """
    return circuit_breaker(
        name=service_name,
        failure_threshold=failure_threshold,
        recovery_timeout=60,
        expected_exception=Exception
    )


def safe_call(func: Callable, *args, fallback_value: Any = None, **kwargs) -> Any:
    """
    Exécute une fonction de manière sécurisée avec fallback
    
    Args:
        func: Fonction à exécuter
        *args: Arguments positionnels
        fallback_value: Valeur de fallback en cas d'erreur
        **kwargs: Arguments nommés
        
    Returns:
        Résultat de la fonction ou valeur de fallback
    """
    try:
        return func(*args, **kwargs)
    except (CircuitBreakerError, Exception) as e:
        logger.warning(f"Safe call failed: {e}, returning fallback value")
        return fallback_value