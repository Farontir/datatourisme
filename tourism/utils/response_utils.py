"""
Response utilities for consistent API response formatting.

This module consolidates response formatting patterns that were scattered
across views and provides standardized error and success responses.
"""
import logging
from typing import Any, Dict, List, Optional, Union
from django.http import JsonResponse, HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

logger = logging.getLogger(__name__)


class ResponseFormatter:
    """
    Standardized response formatting for consistent API responses.
    
    Consolidates response formatting logic that was scattered across
    views and provides a consistent interface for all API responses.
    """
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = None,
        meta: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_200_OK
    ) -> Dict[str, Any]:
        """
        Create a standardized success response.
        
        Args:
            data: Response data
            message: Optional success message
            meta: Optional metadata (pagination, etc.)
            status_code: HTTP status code
            
        Returns:
            Formatted response dictionary
        """
        response_data = {
            'success': True,
            'status_code': status_code,
        }
        
        if data is not None:
            response_data['data'] = data
            
        if message:
            response_data['message'] = message
            
        if meta:
            response_data['meta'] = meta
            
        return response_data
    
    @staticmethod
    def error(
        message: str,
        error_code: str = None,
        details: Any = None,
        status_code: int = status.HTTP_400_BAD_REQUEST
    ) -> Dict[str, Any]:
        """
        Create a standardized error response.
        
        Args:
            message: Error message
            error_code: Optional error code
            details: Optional error details
            status_code: HTTP status code
            
        Returns:
            Formatted error response dictionary
        """
        response_data = {
            'success': False,
            'error': True,
            'message': message,
            'status_code': status_code,
        }
        
        if error_code:
            response_data['error_code'] = error_code
            
        if details:
            response_data['details'] = details
            
        return response_data
    
    @staticmethod
    def validation_error(
        errors: Union[Dict[str, List[str]], List[str]],
        message: str = "Validation failed"
    ) -> Dict[str, Any]:
        """
        Create a standardized validation error response.
        
        Args:
            errors: Validation errors (field -> errors or list of errors)
            message: Error message
            
        Returns:
            Formatted validation error response
        """
        return ResponseFormatter.error(
            message=message,
            error_code='VALIDATION_ERROR',
            details={'validation_errors': errors},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    
    @staticmethod
    def not_found(
        resource: str = "Resource",
        identifier: str = None
    ) -> Dict[str, Any]:
        """
        Create a standardized not found response.
        
        Args:
            resource: Resource type that was not found
            identifier: Optional resource identifier
            
        Returns:
            Formatted not found response
        """
        message = f"{resource} not found"
        if identifier:
            message += f" with identifier: {identifier}"
            
        return ResponseFormatter.error(
            message=message,
            error_code='NOT_FOUND',
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def paginated(
        data: List[Any],
        paginator: PageNumberPagination,
        request,
        total_count: int = None
    ) -> Dict[str, Any]:
        """
        Create a standardized paginated response.
        
        Args:
            data: List of data items
            paginator: DRF paginator instance
            request: Django request object
            total_count: Optional total count override
            
        Returns:
            Formatted paginated response
        """
        page = paginator.paginate_queryset(data, request)
        if page is not None:
            paginated_data = paginator.get_paginated_response(page).data
            
            # Enhance with additional meta information
            meta = {
                'pagination': {
                    'current_page': paginator.page.number,
                    'page_size': paginator.page_size,
                    'total_pages': paginator.page.paginator.num_pages,
                    'total_count': total_count or paginator.page.paginator.count,
                    'has_next': paginator.page.has_next(),
                    'has_previous': paginator.page.has_previous(),
                }
            }
            
            if paginated_data.get('next'):
                meta['pagination']['next_page'] = paginator.page.number + 1
            if paginated_data.get('previous'):
                meta['pagination']['previous_page'] = paginator.page.number - 1
                
            return ResponseFormatter.success(
                data=paginated_data.get('results', page),
                meta=meta
            )
        
        # No pagination needed
        return ResponseFormatter.success(data=data)


class APIResponseMixin:
    """
    Mixin for DRF views to provide consistent response formatting.
    
    Adds convenience methods for creating standardized responses
    that can be used across all view classes.
    """
    
    def success_response(
        self,
        data: Any = None,
        message: str = None,
        status_code: int = status.HTTP_200_OK,
        headers: Optional[Dict[str, str]] = None
    ) -> Response:
        """Create a DRF success response."""
        response_data = ResponseFormatter.success(data, message, status_code=status_code)
        response = Response(response_data, status=status_code)
        
        if headers:
            for header, value in headers.items():
                response[header] = value
                
        return response
    
    def error_response(
        self,
        message: str,
        error_code: str = None,
        details: Any = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        headers: Optional[Dict[str, str]] = None
    ) -> Response:
        """Create a DRF error response."""
        response_data = ResponseFormatter.error(message, error_code, details, status_code)
        response = Response(response_data, status=status_code)
        
        if headers:
            for header, value in headers.items():
                response[header] = value
                
        return response
    
    def validation_error_response(
        self,
        errors: Union[Dict[str, List[str]], List[str]],
        message: str = "Validation failed"
    ) -> Response:
        """Create a DRF validation error response."""
        response_data = ResponseFormatter.validation_error(errors, message)
        return Response(response_data, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    def not_found_response(
        self,
        resource: str = "Resource",
        identifier: str = None
    ) -> Response:
        """Create a DRF not found response."""
        response_data = ResponseFormatter.not_found(resource, identifier)
        return Response(response_data, status=status.HTTP_404_NOT_FOUND)
    
    def handle_exception_response(self, exc: Exception) -> Response:
        """
        Handle exceptions with consistent error responses.
        
        Args:
            exc: Exception to handle
            
        Returns:
            Formatted error response
        """
        # Import here to avoid circular imports
        from tourism.exceptions import TourismBaseException
        
        if isinstance(exc, TourismBaseException):
            return self.error_response(
                message=exc.message,
                error_code=exc.code,
                details=exc.details,
                status_code=self._get_status_code_for_exception(exc)
            )
        else:
            logger.error(f"Unhandled exception in view: {exc}", exc_info=True)
            return self.error_response(
                message="An unexpected error occurred",
                error_code='INTERNAL_ERROR',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_status_code_for_exception(self, exc) -> int:
        """Get appropriate HTTP status code for custom exceptions."""
        status_map = {
            'ValidationError': status.HTTP_400_BAD_REQUEST,
            'SecurityError': status.HTTP_403_FORBIDDEN,
            'ServiceUnavailableError': status.HTTP_503_SERVICE_UNAVAILABLE,
            'DataIntegrityError': status.HTTP_409_CONFLICT,
            'ImportError': status.HTTP_422_UNPROCESSABLE_ENTITY,
            'SearchError': status.HTTP_500_INTERNAL_SERVER_ERROR,
        }
        
        return status_map.get(exc.__class__.__name__, status.HTTP_500_INTERNAL_SERVER_ERROR)


class SearchResponseFormatter:
    """
    Specialized response formatter for search results.
    
    Consolidates search response formatting that was duplicated
    across search views and services.
    """
    
    @staticmethod
    def format_search_results(
        hits: List[Dict[str, Any]],
        total: int,
        took: float,
        aggregations: Dict[str, Any] = None,
        page: int = 1,
        page_size: int = 20,
        search_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Format search results with consistent structure.
        
        Args:
            hits: Search result hits
            total: Total number of results
            took: Search execution time in milliseconds
            aggregations: Search aggregations/facets
            page: Current page number
            page_size: Results per page
            search_meta: Additional search metadata
            
        Returns:
            Formatted search response
        """
        response_data = {
            'hits': hits,
            'total': total,
            'took': took,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
        }
        
        if aggregations:
            response_data['aggregations'] = aggregations
            
        if search_meta:
            response_data['search_meta'] = search_meta
            
        # Add pagination info
        response_data['has_next'] = page * page_size < total
        response_data['has_previous'] = page > 1
        
        if response_data['has_next']:
            response_data['next_page'] = page + 1
        if response_data['has_previous']:
            response_data['previous_page'] = page - 1
            
        return response_data
    
    @staticmethod
    def format_autocomplete_results(
        suggestions: List[Dict[str, Any]],
        query: str,
        took: float = 0
    ) -> Dict[str, Any]:
        """
        Format autocomplete/suggestion results.
        
        Args:
            suggestions: List of suggestion objects
            query: Original search query
            took: Query execution time
            
        Returns:
            Formatted autocomplete response
        """
        return {
            'suggestions': suggestions,
            'query': query,
            'count': len(suggestions),
            'took': took
        }
    
    @staticmethod
    def format_geo_search_results(
        hits: List[Dict[str, Any]],
        total: int,
        center: Dict[str, float],
        radius_km: float,
        took: float = 0,
        aggregations: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Format geographic search results.
        
        Args:
            hits: Search result hits with distance information
            total: Total number of results
            center: Search center coordinates
            radius_km: Search radius in kilometers
            took: Search execution time
            aggregations: Optional aggregations
            
        Returns:
            Formatted geo search response
        """
        response_data = {
            'hits': hits,
            'total': total,
            'took': took,
            'search_params': {
                'center': center,
                'radius_km': radius_km
            }
        }
        
        if aggregations:
            response_data['aggregations'] = aggregations
            
        # Add distance statistics if available
        distances = [hit.get('distance_km') for hit in hits if hit.get('distance_km')]
        if distances:
            response_data['distance_stats'] = {
                'min_distance': min(distances),
                'max_distance': max(distances),
                'avg_distance': sum(distances) / len(distances)
            }
            
        return response_data


class ExportResponseFormatter:
    """
    Response formatter for data export operations.
    
    Handles consistent formatting for CSV, Excel, and other export formats.
    """
    
    @staticmethod
    def create_csv_response(
        data: str,
        filename: str,
        content_type: str = 'text/csv'
    ) -> HttpResponse:
        """Create a CSV download response."""
        response = HttpResponse(data, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
    
    @staticmethod
    def create_excel_response(
        data: bytes,
        filename: str
    ) -> HttpResponse:
        """Create an Excel download response."""
        response = HttpResponse(
            data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    
    @staticmethod
    def create_json_export_response(
        data: Any,
        filename: str
    ) -> HttpResponse:
        """Create a JSON export download response."""
        import json
        
        json_data = json.dumps(data, indent=2, ensure_ascii=False)
        response = HttpResponse(json_data, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response