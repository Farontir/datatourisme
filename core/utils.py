from django.utils.crypto import get_random_string

def generate_secret_key():
    """Génère une clé secrète Django sécurisée"""
    return get_random_string(
        50,
        'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)'
    )

def clean_json_ld_url(url):
    """Nettoie et valide une URL JSON-LD"""
    if not url:
        return ''
    
    # Supprimer les espaces et caractères indésirables
    url = url.strip()
    
    # Encoder les espaces
    url = url.replace(' ', '%20')
    
    return url

def extract_language_from_accept_header(accept_language):
    """
    Extrait la langue préférée depuis l'header Accept-Language
    
    Exemple: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7" -> "fr"
    """
    if not accept_language:
        return 'fr'
    
    # Parse l'header Accept-Language
    languages = []
    for lang in accept_language.split(','):
        parts = lang.strip().split(';')
        code = parts[0].split('-')[0].lower()
        
        # Qualité par défaut
        quality = 1.0
        if len(parts) > 1:
            try:
                quality = float(parts[1].split('=')[1])
            except (IndexError, ValueError):
                quality = 1.0
        
        languages.append((code, quality))
    
    # Trier par qualité décroissante
    languages.sort(key=lambda x: x[1], reverse=True)
    
    # Retourner la première langue supportée
    supported_languages = ['fr', 'en', 'de', 'es', 'it', 'nl']
    for lang, _ in languages:
        if lang in supported_languages:
            return lang
    
    return 'fr'  # Défaut

def truncate_text(text, max_length=200, suffix='...'):
    """Tronque un texte à une longueur maximale"""
    if not text:
        return ''
    
    if len(text) <= max_length:
        return text
    
    # Trouver le dernier espace avant la limite
    truncated = text[:max_length]
    last_space = truncated.rfind(' ')
    
    if last_space > max_length * 0.8:  # Si l'espace est assez proche
        truncated = truncated[:last_space]
    
    return truncated + suffix