"""
Base service classes to eliminate code duplication across service modules.

This module provides abstract base classes and mixins that consolidate
common patterns used across different service implementations.
"""
import logging
import threading
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime
from django.db import transaction
from django.utils import timezone

from .cache_utils import CacheKeyGenerator, CacheManager
from .validation_utils import InputValidator, ValidationMixin
from ..metrics import ApplicationMetrics, time_it
from ..exceptions import ValidationError, ImportError, ErrorContext

logger = logging.getLogger(__name__)


class BaseService(ABC, ValidationMixin):
    """
    Abstract base class for all service classes.
    
    Provides common functionality that was duplicated across:
    - JsonLdImportService
    - SearchService
    - CacheService
    """
    
    def __init__(self):
        self.errors = []
        self.warnings = []
        self._lock = threading.Lock()
        self.stats = {
            'operations_count': 0,
            'success_count': 0,
            'error_count': 0,
            'start_time': None,
            'end_time': None
        }
    
    def start_operation(self) -> None:
        """Mark the start of a service operation."""
        with self._lock:
            self.stats['start_time'] = timezone.now()
            self.stats['operations_count'] += 1
    
    def end_operation(self, success: bool = True) -> None:
        """Mark the end of a service operation."""
        with self._lock:
            self.stats['end_time'] = timezone.now()
            if success:
                self.stats['success_count'] += 1
            else:
                self.stats['error_count'] += 1
    
    def record_error(self, error: Union[str, Exception], context: Dict[str, Any] = None) -> None:
        """Record an error with context."""
        with self._lock:
            error_entry = {
                'timestamp': timezone.now().isoformat(),
                'message': str(error),
                'context': context or {}
            }
            
            if isinstance(error, Exception):
                error_entry.update({
                    'type': type(error).__name__,
                    'details': getattr(error, 'details', None)
                })
            
            self.errors.append(error_entry)
            logger.error(f"{self.__class__.__name__} error: {error}", extra=context)
    
    def record_warning(self, message: str, context: Dict[str, Any] = None) -> None:
        """Record a warning with context."""
        with self._lock:
            warning_entry = {
                'timestamp': timezone.now().isoformat(),
                'message': message,
                'context': context or {}
            }
            self.warnings.append(warning_entry)
            logger.warning(f"{self.__class__.__name__} warning: {message}", extra=context)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get operation statistics."""
        with self._lock:
            stats = self.stats.copy()
            stats.update({
                'error_count': len(self.errors),
                'warning_count': len(self.warnings),
                'latest_errors': self.errors[-5:] if self.errors else [],
                'latest_warnings': self.warnings[-5:] if self.warnings else []
            })
            
            if stats['start_time'] and stats['end_time']:
                duration = stats['end_time'] - stats['start_time']
                stats['duration_seconds'] = duration.total_seconds()
                
                if stats['operations_count'] > 0:
                    stats['operations_per_second'] = stats['operations_count'] / duration.total_seconds()
                    stats['success_rate'] = (stats['success_count'] / stats['operations_count']) * 100
        
        return stats
    
    def clear_stats(self) -> None:
        """Clear statistics and error logs."""
        with self._lock:
            self.errors.clear()
            self.warnings.clear()
            self.stats = {
                'operations_count': 0,
                'success_count': 0,
                'error_count': 0,
                'start_time': None,
                'end_time': None
            }


class BatchProcessingMixin:
    """
    Mixin for services that process data in batches.
    
    Consolidates batch processing logic that was duplicated
    in JsonLdImportService and other services.
    """
    
    DEFAULT_BATCH_SIZE = 100
    DEFAULT_MAX_WORKERS = 4
    
    def __init__(self, batch_size: int = None, max_workers: int = None):
        super().__init__()
        self.batch_size = batch_size or self.DEFAULT_BATCH_SIZE
        self.max_workers = max_workers or self.DEFAULT_MAX_WORKERS
    
    def process_batch(
        self,
        items: List[Any],
        process_function: Callable,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Process a list of items in batches.
        
        Args:
            items: List of items to process
            process_function: Function to process each batch
            progress_callback: Optional callback for progress updates
            
        Returns:
            Processing results with statistics
        """
        if not items:
            return {'processed': 0, 'failed': 0, 'results': []}
        
        results = {
            'processed': 0,
            'failed': 0,
            'results': [],
            'errors': []
        }
        
        total_batches = (len(items) + self.batch_size - 1) // self.batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(items))
            batch_items = items[start_idx:end_idx]
            
            try:
                batch_result = self._process_single_batch(batch_items, process_function)
                
                results['processed'] += batch_result.get('processed', 0)
                results['failed'] += batch_result.get('failed', 0)
                results['results'].extend(batch_result.get('results', []))
                results['errors'].extend(batch_result.get('errors', []))
                
                # Progress callback
                if progress_callback:
                    progress_callback({
                        'batch': batch_num + 1,
                        'total_batches': total_batches,
                        'items_processed': results['processed'],
                        'items_failed': results['failed']
                    })
                    
            except Exception as e:
                error_msg = f"Batch {batch_num + 1} failed: {str(e)}"
                self.record_error(e, {'batch_number': batch_num + 1})
                results['errors'].append(error_msg)
                results['failed'] += len(batch_items)
        
        return results
    
    def _process_single_batch(
        self,
        batch_items: List[Any],
        process_function: Callable
    ) -> Dict[str, Any]:
        """Process a single batch of items."""
        batch_result = {
            'processed': 0,
            'failed': 0,
            'results': [],
            'errors': []
        }
        
        try:
            with transaction.atomic():
                # Use savepoint for partial rollback capability
                sid = transaction.savepoint()
                
                try:
                    # Process the batch
                    result = process_function(batch_items)
                    
                    if isinstance(result, dict):
                        batch_result.update(result)
                    else:
                        batch_result['processed'] = len(batch_items)
                        batch_result['results'] = result if isinstance(result, list) else [result]
                    
                    transaction.savepoint_commit(sid)
                    
                except Exception as e:
                    transaction.savepoint_rollback(sid)
                    raise
                    
        except Exception as e:
            error_msg = f"Batch transaction failed: {str(e)}"
            batch_result['errors'].append(error_msg)
            batch_result['failed'] = len(batch_items)
            logger.error(error_msg, exc_info=True)
        
        return batch_result


class CachingServiceMixin:
    """
    Mixin for services that use caching functionality.
    
    Consolidates caching patterns that were scattered across
    different service classes.
    """
    
    def __init__(self, cache_prefix: str = None):
        super().__init__()
        self.cache_prefix = cache_prefix or self.__class__.__name__.lower()
    
    def get_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for service operations."""
        return CacheKeyGenerator.generate_key(
            self.cache_prefix,
            {operation: params}
        )
    
    def cache_result(
        self,
        operation: str,
        params: Dict[str, Any],
        data: Any,
        timeout: Optional[int] = None
    ) -> str:
        """Cache operation result."""
        cache_key = self.get_cache_key(operation, params)
        
        success = CacheManager.warm_cache({cache_key: data})
        if success.get(cache_key, False):
            logger.debug(f"Cached result for {operation} with key: {cache_key}")
        else:
            logger.warning(f"Failed to cache result for {operation}")
            
        return cache_key
    
    def get_cached_result(
        self,
        operation: str,
        params: Dict[str, Any]
    ) -> Optional[Any]:
        """Get cached operation result."""
        cache_key = self.get_cache_key(operation, params)
        data, cache_hit = CacheManager.get_or_set_list(
            self.cache_prefix,
            {operation: params},
            lambda **kwargs: None  # Don't fetch if not in cache
        )
        
        if cache_hit:
            logger.debug(f"Cache hit for {operation} with key: {cache_key}")
            return data
        else:
            logger.debug(f"Cache miss for {operation} with key: {cache_key}")
            return None
    
    def invalidate_cache(self, pattern: str = None) -> int:
        """Invalidate cached results."""
        if pattern is None:
            pattern = f"*{self.cache_prefix}*"
        
        cleared_count = CacheManager.invalidate_pattern(pattern)
        logger.info(f"Invalidated {cleared_count} cache keys matching pattern: {pattern}")
        return cleared_count


class ValidatedService(BaseService):
    """
    Service base class with built-in validation capabilities.
    
    Consolidates validation patterns used across different services.
    """
    
    def validate_input_data(
        self,
        data: Dict[str, Any],
        validation_schema: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate input data against a schema.
        
        Args:
            data: Data to validate
            validation_schema: Validation rules for each field
            
        Returns:
            Validation result
            
        Raises:
            ValidationError: If validation fails
        """
        result = self.validate_request_params(data, validation_schema)
        
        if not result['valid']:
            raise ValidationError(
                "Input validation failed",
                code='VALIDATION_FAILED',
                details={
                    'errors': result['errors'],
                    'warnings': result.get('warnings', {})
                }
            )
        
        # Record warnings if any
        if result.get('warnings'):
            for field, warnings in result['warnings'].items():
                for warning in warnings:
                    self.record_warning(f"Validation warning for {field}: {warning}")
        
        return result['validated_data']
    
    def validate_and_process(
        self,
        data: Any,
        validation_schema: Dict[str, Dict[str, Any]],
        process_function: Callable
    ) -> Any:
        """
        Validate data and process it if validation passes.
        
        Args:
            data: Data to validate and process
            validation_schema: Validation rules
            process_function: Function to process validated data
            
        Returns:
            Processing result
        """
        with ErrorContext(operation=f"{self.__class__.__name__}.validate_and_process"):
            # Validate input
            if isinstance(data, dict):
                validated_data = self.validate_input_data(data, validation_schema)
            else:
                validated_data = data
            
            # Process validated data
            return process_function(validated_data)


class MetricsServiceMixin:
    """
    Mixin for services that need metrics tracking.
    
    Consolidates metrics recording patterns across services.
    """
    
    def __init__(self, service_name: str = None):
        super().__init__()
        self.service_name = service_name or self.__class__.__name__
    
    def record_operation_metrics(
        self,
        operation: str,
        duration: float,
        success: bool = True,
        metadata: Dict[str, Any] = None
    ) -> None:
        """Record metrics for a service operation."""
        tags = {
            'service': self.service_name,
            'operation': operation,
            'success': success
        }
        
        if metadata:
            tags.update(metadata)
        
        # Record timing
        ApplicationMetrics.record_timing(
            f'{self.service_name.lower()}.{operation}.duration',
            duration,
            tags
        )
        
        # Record counter
        ApplicationMetrics.increment_counter(
            f'{self.service_name.lower()}.{operation}.count',
            1,
            tags
        )
        
        if not success:
            ApplicationMetrics.increment_counter(
                f'{self.service_name.lower()}.{operation}.errors',
                1,
                tags
            )
    
    def time_operation(self, operation: str, metadata: Dict[str, Any] = None):
        """
        Decorator/context manager for timing operations.
        
        Can be used as a decorator or context manager.
        """
        def decorator(func):
            def wrapper(*args, **kwargs):
                import time
                start_time = time.time()
                success = True
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    raise
                finally:
                    duration = time.time() - start_time
                    self.record_operation_metrics(operation, duration, success, metadata)
            
            return wrapper
        
        # If called with function argument, act as decorator
        if hasattr(operation, '__call__'):
            func = operation
            operation = func.__name__
            return decorator(func)
        
        # Otherwise, return decorator
        return decorator


class ImportServiceBase(ValidatedService, BatchProcessingMixin, CachingServiceMixin, MetricsServiceMixin):
    """
    Base class for import services that combines all useful mixins.
    
    This consolidates the common patterns used in JsonLdImportService
    and can be used for other import services.
    """
    
    def __init__(self, batch_size: int = None, max_workers: int = None):
        ValidatedService.__init__(self)
        BatchProcessingMixin.__init__(self, batch_size, max_workers)
        CachingServiceMixin.__init__(self, 'import')
        MetricsServiceMixin.__init__(self, 'ImportService')
        
        self.imported_count = 0
        self.failed_count = 0
    
    @abstractmethod
    def import_single_item(self, item_data: Any) -> Any:
        """Import a single item. Must be implemented by subclasses."""
        pass
    
    def import_items(
        self,
        items: List[Any],
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Import a list of items using batch processing.
        
        Args:
            items: List of items to import
            progress_callback: Optional progress callback
            
        Returns:
            Import results with statistics
        """
        self.start_operation()
        
        try:
            results = self.process_batch(
                items,
                self._import_batch,
                progress_callback
            )
            
            self.imported_count += results['processed']
            self.failed_count += results['failed']
            
            self.end_operation(success=results['failed'] == 0)
            return results
            
        except Exception as e:
            self.end_operation(success=False)
            self.record_error(e)
            raise
    
    def _import_batch(self, batch_items: List[Any]) -> Dict[str, Any]:
        """Import a batch of items."""
        results = {
            'processed': 0,
            'failed': 0,
            'results': [],
            'errors': []
        }
        
        for item in batch_items:
            try:
                result = self.import_single_item(item)
                if result is not None:
                    results['processed'] += 1
                    results['results'].append(result)
                else:
                    results['failed'] += 1
                    
            except Exception as e:
                results['failed'] += 1
                results['errors'].append(str(e))
                self.record_error(e, {'item': str(item)[:100]})
        
        return results