"""
Custom exceptions and error handling for the tourism application
"""
import logging
from typing import Dict, Any, Optional
from django.http import JsonResponse
from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class TourismBaseException(Exception):
    """Base exception for all tourism-related errors"""
    def __init__(self, message: str, code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.code = code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(TourismBaseException):
    """Raised when input validation fails"""
    pass


class SecurityError(TourismBaseException):
    """Raised when security checks fail"""
    pass


class ServiceUnavailableError(TourismBaseException):
    """Raised when external services are unavailable"""
    pass


class DataIntegrityError(TourismBaseException):
    """Raised when data integrity constraints are violated"""
    pass


class ImportError(TourismBaseException):
    """Raised during data import operations"""
    pass


class SearchError(TourismBaseException):
    """Raised during search operations"""
    pass


class ErrorHandler:
    """Centralized error handling and logging"""
    
    @staticmethod
    def log_error(error: Exception, context: Optional[Dict[str, Any]] = None):
        """Log an error with context information"""
        context = context or {}
        
        if isinstance(error, TourismBaseException):
            logger.error(
                f"Tourism Error [{error.code}]: {error.message}",
                extra={
                    'error_code': error.code,
                    'error_details': error.details,
                    'context': context
                }
            )
        else:
            logger.error(
                f"Unexpected Error: {str(error)}",
                extra={
                    'error_type': type(error).__name__,
                    'context': context
                },
                exc_info=True
            )
    
    @staticmethod
    def create_error_response(
        error: Exception, 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        include_details: bool = False
    ) -> JsonResponse:
        """Create a standardized error response"""
        
        if isinstance(error, TourismBaseException):
            response_data = {
                'error': True,
                'code': error.code,
                'message': error.message,
            }
            
            if include_details and error.details:
                response_data['details'] = error.details
                
        else:
            response_data = {
                'error': True,
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
            }
        
        return JsonResponse(response_data, status=status_code)
    
    @staticmethod
    def handle_import_error(
        error: Exception, 
        resource_id: str = None, 
        operation: str = None
    ) -> Dict[str, Any]:
        """Handle import-related errors with consistent format"""
        
        error_info = {
            'success': False,
            'timestamp': logger._context.get('timestamp') if hasattr(logger, '_context') else None,
            'operation': operation or 'unknown',
        }
        
        if resource_id:
            error_info['resource_id'] = resource_id
        
        if isinstance(error, TourismBaseException):
            error_info.update({
                'error_code': error.code,
                'error_message': error.message,
                'error_details': error.details
            })
        else:
            error_info.update({
                'error_code': 'UNEXPECTED_ERROR',
                'error_message': str(error),
                'error_type': type(error).__name__
            })
        
        ErrorHandler.log_error(error, {'resource_id': resource_id, 'operation': operation})
        return error_info


def custom_exception_handler(exc, context):
    """Custom exception handler for DRF"""
    
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If the exception is not handled by DRF, handle it ourselves
    if response is None:
        if isinstance(exc, TourismBaseException):
            status_code = {
                'ValidationError': status.HTTP_400_BAD_REQUEST,
                'SecurityError': status.HTTP_403_FORBIDDEN,
                'ServiceUnavailableError': status.HTTP_503_SERVICE_UNAVAILABLE,
                'DataIntegrityError': status.HTTP_409_CONFLICT,
                'ImportError': status.HTTP_422_UNPROCESSABLE_ENTITY,
                'SearchError': status.HTTP_500_INTERNAL_SERVER_ERROR,
            }.get(exc.__class__.__name__, status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response_data = {
                'error': True,
                'code': exc.code,
                'message': exc.message,
            }
            
            # Include details in development
            from django.conf import settings
            if getattr(settings, 'DEBUG', False) and exc.details:
                response_data['details'] = exc.details
            
            response = Response(response_data, status=status_code)
        else:
            # Log unexpected errors
            ErrorHandler.log_error(exc, context)
            
            response = Response({
                'error': True,
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


# Context manager for error handling
class ErrorContext:
    """Context manager for consistent error handling"""
    
    def __init__(self, operation: str, resource_id: str = None):
        self.operation = operation
        self.resource_id = resource_id
        self.success = False
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            ErrorHandler.log_error(
                exc_val, 
                {'operation': self.operation, 'resource_id': self.resource_id}
            )
            return False  # Don't suppress the exception
        
        self.success = True
        return None
    
    def get_result(self, data: Any = None) -> Dict[str, Any]:
        """Get standardized result format"""
        result = {
            'success': self.success,
            'operation': self.operation,
        }
        
        if self.resource_id:
            result['resource_id'] = self.resource_id
        
        if data is not None:
            result['data'] = data
        
        return result