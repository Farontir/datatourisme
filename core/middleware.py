from django.utils.deprecation import MiddlewareMixin
from .utils import extract_language_from_accept_header

class LanguageMiddleware(MiddlewareMixin):
    """
    Middleware pour gérer automatiquement la langue de l'utilisateur
    Priorité : paramètre GET > header Accept-Language > défaut (fr)
    """
    
    def process_request(self, request):
        # 1. Vérifier le paramètre GET
        language = request.GET.get('lang', '').lower()
        
        # 2. Si pas de paramètre, utiliser l'header Accept-Language
        if not language:
            accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
            language = extract_language_from_accept_header(accept_language)
        
        # 3. Valider la langue
        supported_languages = ['fr', 'en', 'de', 'es', 'it', 'nl']
        if language not in supported_languages:
            language = 'fr'
        
        # 4. Stocker la langue dans la requête
        request.language = language
        
        return None
    
    def process_response(self, request, response):
        # Ajouter un header pour indiquer la langue utilisée
        if hasattr(request, 'language'):
            response['Content-Language'] = request.language
        
        return response