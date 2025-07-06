"""
Validation utilities for consistent input validation across the application.

This module consolidates validation logic that was scattered across
security.py, services.py, and views.py modules.
"""
import re
import logging
from typing import Any, Dict, List, Optional, Union, Callable
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from tourism.exceptions import ValidationError

logger = logging.getLogger(__name__)


class InputValidator:
    """
    Centralized input validation with security-focused checks.
    
    Consolidates validation logic from:
    - tourism/security.py (InputValidator patterns)
    - tourism/services.py (_validate_json_data)
    - tourism/views.py (parameter validation)
    """
    
    # Optimized patterns to prevent ReDoS attacks
    SQL_INJECTION_PATTERNS = [
        re.compile(r'\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b', re.IGNORECASE),
        re.compile(r'(--|#|/\*|\*/)', re.IGNORECASE),
        re.compile(r'\b(or|and)\s+\d{1,10}\s*=\s*\d{1,10}', re.IGNORECASE),
        re.compile(r'\b(or|and)\s+[\'"][^\'\"]{0,100}[\'"]', re.IGNORECASE),
    ]
    
    XSS_PATTERNS = [
        re.compile(r'<script[^>]{0,100}>', re.IGNORECASE),
        re.compile(r'</script>', re.IGNORECASE),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'on\w{1,20}\s*=', re.IGNORECASE),
        re.compile(r'<iframe[^>]{0,100}>', re.IGNORECASE),
        re.compile(r'<object[^>]{0,100}>', re.IGNORECASE),
        re.compile(r'<embed[^>]{0,100}>', re.IGNORECASE),
    ]
    
    LDAP_INJECTION_PATTERNS = [
        re.compile(r'[()&|!]'),
        re.compile(r'\*'),
        re.compile(r'[\x00-\x1f\x7f-\xff]'),
    ]
    
    @classmethod
    def validate_string(
        cls,
        value: str,
        min_length: int = 0,
        max_length: int = 1000,
        allow_empty: bool = True,
        security_checks: List[str] = None
    ) -> Dict[str, Any]:
        """
        Validate a string input with optional security checks.
        
        Args:
            value: String to validate
            min_length: Minimum allowed length
            max_length: Maximum allowed length
            allow_empty: Whether empty strings are allowed
            security_checks: List of security checks ('sql', 'xss', 'ldap')
            
        Returns:
            Validation result dictionary
        """
        if security_checks is None:
            security_checks = ['sql', 'xss']
            
        result = {
            'valid': True,
            'value': value,
            'errors': [],
            'warnings': []
        }
        
        # Type check
        if not isinstance(value, str):
            result['valid'] = False
            result['errors'].append(f"Expected string, got {type(value).__name__}")
            return result
        
        # Empty check
        if not value.strip():
            if not allow_empty:
                result['valid'] = False
                result['errors'].append("Value cannot be empty")
            return result
        
        # Length checks
        if len(value) < min_length:
            result['valid'] = False
            result['errors'].append(f"Value must be at least {min_length} characters")
            
        if len(value) > max_length:
            result['valid'] = False
            result['errors'].append(f"Value must be no more than {max_length} characters")
        
        # Security checks
        threats = cls._check_security_threats(value, security_checks)
        if threats:
            result['valid'] = False
            result['errors'].extend([threat['message'] for threat in threats])
        
        return result
    
    @classmethod
    def validate_email_address(cls, email: str) -> Dict[str, Any]:
        """Validate an email address."""
        result = {
            'valid': True,
            'value': email,
            'errors': []
        }
        
        if not email:
            result['valid'] = False
            result['errors'].append("Email address is required")
            return result
            
        try:
            validate_email(email)
        except DjangoValidationError as e:
            result['valid'] = False
            result['errors'].extend(e.messages)
            
        return result
    
    @classmethod
    def validate_coordinates(
        cls,
        lat: Union[str, float],
        lng: Union[str, float]
    ) -> Dict[str, Any]:
        """
        Validate geographic coordinates.
        
        Args:
            lat: Latitude value
            lng: Longitude value
            
        Returns:
            Validation result with normalized coordinates
        """
        result = {
            'valid': True,
            'coordinates': {},
            'errors': []
        }
        
        try:
            lat_float = float(lat)
            lng_float = float(lng)
            
            # Validate ranges
            if not (-90 <= lat_float <= 90):
                result['valid'] = False
                result['errors'].append(f"Latitude must be between -90 and 90, got {lat_float}")
                
            if not (-180 <= lng_float <= 180):
                result['valid'] = False
                result['errors'].append(f"Longitude must be between -180 and 180, got {lng_float}")
                
            if result['valid']:
                result['coordinates'] = {
                    'lat': lat_float,
                    'lng': lng_float
                }
                
        except (ValueError, TypeError) as e:
            result['valid'] = False
            result['errors'].append(f"Invalid coordinate format: {e}")
            
        return result
    
    @classmethod
    def validate_positive_number(
        cls,
        value: Union[str, int, float],
        min_value: float = 0,
        max_value: float = None
    ) -> Dict[str, Any]:
        """Validate a positive number with optional range."""
        result = {
            'valid': True,
            'value': None,
            'errors': []
        }
        
        try:
            if isinstance(value, str):
                # Try to convert string to number
                if '.' in value:
                    num_value = float(value)
                else:
                    num_value = int(value)
            else:
                num_value = value
                
            # Range checks
            if num_value < min_value:
                result['valid'] = False
                result['errors'].append(f"Value must be at least {min_value}")
                
            if max_value is not None and num_value > max_value:
                result['valid'] = False
                result['errors'].append(f"Value must be no more than {max_value}")
                
            if result['valid']:
                result['value'] = num_value
                
        except (ValueError, TypeError) as e:
            result['valid'] = False
            result['errors'].append(f"Invalid number format: {e}")
            
        return result
    
    @classmethod
    def validate_choice(
        cls,
        value: str,
        choices: List[str],
        case_sensitive: bool = True
    ) -> Dict[str, Any]:
        """Validate that a value is in a list of allowed choices."""
        result = {
            'valid': True,
            'value': value,
            'errors': []
        }
        
        if not case_sensitive:
            value = value.lower()
            choices = [choice.lower() for choice in choices]
            
        if value not in choices:
            result['valid'] = False
            result['errors'].append(f"Value must be one of: {', '.join(choices)}")
            
        return result
    
    @classmethod
    def validate_jsonld_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate JSON-LD data structure for tourism resources.
        
        Consolidates validation logic from services.py.
        """
        result = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Required fields
        required_fields = ['@id', '@type']
        for field in required_fields:
            if field not in data:
                result['valid'] = False
                result['errors'].append(f"Missing required field: {field}")
        
        # Validate @id format
        if '@id' in data:
            id_validation = cls.validate_string(
                data['@id'],
                min_length=1,
                max_length=500,
                allow_empty=False
            )
            if not id_validation['valid']:
                result['valid'] = False
                result['errors'].extend([f"@id {error}" for error in id_validation['errors']])
        
        # Validate @type
        if '@type' in data:
            type_value = data['@type']
            if isinstance(type_value, list):
                if not type_value:
                    result['valid'] = False
                    result['errors'].append("@type cannot be empty list")
            elif not isinstance(type_value, str):
                result['valid'] = False
                result['errors'].append("@type must be string or list of strings")
        
        # Validate geographic data if present
        if 'schema:geo' in data:
            geo_data = data['schema:geo']
            if isinstance(geo_data, dict):
                lat = geo_data.get('schema:latitude')
                lng = geo_data.get('schema:longitude')
                
                if lat is not None and lng is not None:
                    coord_validation = cls.validate_coordinates(lat, lng)
                    if not coord_validation['valid']:
                        result['valid'] = False
                        result['errors'].extend(coord_validation['errors'])
        
        # Validate dates
        date_fields = ['creationDate', 'lastModified', 'modificationDate']
        for field in date_fields:
            if field in data:
                date_validation = cls.validate_date_string(data[field])
                if not date_validation['valid']:
                    result['warnings'].extend([f"{field}: {error}" for error in date_validation['errors']])
        
        return result
    
    @classmethod
    def validate_date_string(cls, date_str: str) -> Dict[str, Any]:
        """Validate a date string in various ISO formats."""
        result = {
            'valid': True,
            'value': date_str,
            'errors': []
        }
        
        if not isinstance(date_str, str):
            result['valid'] = False
            result['errors'].append("Date must be a string")
            return result
        
        # Try common date formats
        from datetime import datetime
        formats = [
            '%Y-%m-%d',
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y-%m-%dT%H:%M:%S.%fZ'
        ]
        
        for fmt in formats:
            try:
                datetime.strptime(date_str, fmt)
                return result  # Valid format found
            except ValueError:
                continue
        
        # If we get here, no format matched
        result['valid'] = False
        result['errors'].append(f"Invalid date format: {date_str}")
        return result
    
    @classmethod
    def _check_security_threats(
        cls,
        value: str,
        check_types: List[str]
    ) -> List[Dict[str, str]]:
        """Check for security threats in input string."""
        threats = []
        
        pattern_map = {
            'sql': cls.SQL_INJECTION_PATTERNS,
            'xss': cls.XSS_PATTERNS,
            'ldap': cls.LDAP_INJECTION_PATTERNS
        }
        
        for check_type in check_types:
            if check_type in pattern_map:
                for pattern in pattern_map[check_type]:
                    if pattern.search(value):
                        threats.append({
                            'type': check_type,
                            'pattern': pattern.pattern,
                            'message': f'Potential {check_type.upper()} injection detected'
                        })
                        break  # One threat per type is enough
        
        return threats


class ValidationMixin:
    """
    Mixin for views and services to add validation capabilities.
    
    Provides convenient validation methods that can be used
    across different classes.
    """
    
    def validate_request_params(
        self,
        params: Dict[str, Any],
        validation_rules: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate multiple request parameters against rules.
        
        Args:
            params: Dictionary of parameter name -> value
            validation_rules: Dictionary of parameter name -> validation config
            
        Returns:
            Validation result with all parameter results
            
        Example:
            rules = {
                'email': {'type': 'email', 'required': True},
                'age': {'type': 'positive_number', 'min_value': 0, 'max_value': 120},
                'country': {'type': 'choice', 'choices': ['US', 'UK', 'FR']}
            }
        """
        result = {
            'valid': True,
            'errors': {},
            'warnings': {},
            'validated_data': {}
        }
        
        for param_name, rules in validation_rules.items():
            param_value = params.get(param_name)
            
            # Check if required
            if rules.get('required', False) and param_value is None:
                result['valid'] = False
                result['errors'][param_name] = [f"{param_name} is required"]
                continue
            
            # Skip validation if optional and not provided
            if param_value is None:
                continue
            
            # Validate based on type
            param_result = self._validate_single_param(param_value, rules)
            
            if not param_result['valid']:
                result['valid'] = False
                result['errors'][param_name] = param_result['errors']
            else:
                result['validated_data'][param_name] = param_result.get('value', param_value)
                
            if param_result.get('warnings'):
                result['warnings'][param_name] = param_result['warnings']
        
        return result
    
    def _validate_single_param(self, value: Any, rules: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single parameter against its rules."""
        validation_type = rules.get('type', 'string')
        
        if validation_type == 'string':
            return InputValidator.validate_string(
                value,
                min_length=rules.get('min_length', 0),
                max_length=rules.get('max_length', 1000),
                allow_empty=rules.get('allow_empty', True),
                security_checks=rules.get('security_checks', ['sql', 'xss'])
            )
        elif validation_type == 'email':
            return InputValidator.validate_email_address(value)
        elif validation_type == 'positive_number':
            return InputValidator.validate_positive_number(
                value,
                min_value=rules.get('min_value', 0),
                max_value=rules.get('max_value')
            )
        elif validation_type == 'choice':
            return InputValidator.validate_choice(
                value,
                choices=rules.get('choices', []),
                case_sensitive=rules.get('case_sensitive', True)
            )
        elif validation_type == 'coordinates':
            lat = value.get('lat') if isinstance(value, dict) else None
            lng = value.get('lng') if isinstance(value, dict) else None
            return InputValidator.validate_coordinates(lat, lng)
        else:
            return {
                'valid': False,
                'errors': [f"Unknown validation type: {validation_type}"]
            }
    
    def get_validated_param(
        self,
        request,
        param_name: str,
        validation_rules: Dict[str, Any],
        default: Any = None
    ) -> Any:
        """
        Get and validate a single parameter from request.
        
        Args:
            request: Django request object
            param_name: Parameter name to extract
            validation_rules: Validation configuration
            default: Default value if parameter not provided
            
        Returns:
            Validated parameter value
            
        Raises:
            ValidationError: If validation fails
        """
        value = request.query_params.get(param_name, default)
        
        if value is None and validation_rules.get('required', False):
            raise ValidationError(
                f"Required parameter '{param_name}' is missing",
                code='MISSING_PARAMETER'
            )
        
        if value is not None:
            result = self._validate_single_param(value, validation_rules)
            if not result['valid']:
                raise ValidationError(
                    f"Invalid value for parameter '{param_name}': {', '.join(result['errors'])}",
                    code='INVALID_PARAMETER',
                    details={'parameter': param_name, 'errors': result['errors']}
                )
            return result.get('value', value)
        
        return default