# Guide d'Utilisation de l'API

## 🎯 Introduction

L'API REST de l'application tourisme fournit un accès complet aux ressources touristiques avec support multilingue et fonctionnalités géospatiales.

### Caractéristiques Principales

- **REST complet** : Opérations CRUD standard
- **Multilingue** : Support de 6 langues
- **Géospatial** : Recherche par proximité
- **Pagination** : Résultats paginés automatiquement
- **Filtrage** : Recherche et tri avancés
- **Documentation** : Swagger/OpenAPI intégré

## 🌐 Informations de Base

### URL de Base
```
http://localhost:8000/api/v1/
```

### Format de Réponse
- **Content-Type** : `application/json`
- **Encodage** : UTF-8
- **Structure** : JSON standardisé

### Langues Supportées
- `fr` - Français (par défaut)
- `en` - Anglais
- `de` - Allemand
- `es` - Espagnol
- `it` - Italien
- `nl` - Néerlandais

## 📚 Documentation Interactive

### Swagger UI
Accédez à la documentation interactive :
```
http://localhost:8000/api/docs/
```

### Schéma OpenAPI
Récupérez le schéma complet :
```
http://localhost:8000/api/schema/
```

## 🔍 Endpoints Principaux

### 1. Liste des Ressources

**GET** `/api/v1/resources/`

Récupère la liste paginée des ressources touristiques.

**Paramètres de requête** :

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `page` | integer | Numéro de page | `?page=2` |
| `search` | string | Recherche textuelle | `?search=musée` |
| `lang` | string | Langue de réponse | `?lang=en` |
| `ordering` | string | Tri des résultats | `?ordering=-created_at` |

**Exemple de requête** :
```bash
curl -X GET "http://localhost:8000/api/v1/resources/?search=château&lang=en&page=1"
```

**Réponse** :
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/v1/resources/?lang=en&page=2&search=château",
  "previous": null,
  "results": [
    {
      "id": 1,
      "resource_id": "https://data.datatourisme.fr/resource/123",
      "resource_types": ["PlaceOfInterest", "CulturalSite"],
      "name": "Château de Versailles",
      "description": "Former royal residence and UNESCO World Heritage site...",
      "location": {
        "type": "Point",
        "coordinates": [2.120355, 48.804865]
      },
      "main_image": "https://example.com/versailles.jpg",
      "price_range": {
        "min": 20,
        "currency": "EUR"
      }
    }
  ]
}
```

### 2. Détail d'une Ressource

**GET** `/api/v1/resources/{id}/`

Récupère les détails complets d'une ressource.

**Paramètres** :
- `id` - ID numérique de la ressource
- `lang` - Langue de réponse (optionnel)

**Exemple de requête** :
```bash
curl -X GET "http://localhost:8000/api/v1/resources/1/?lang=fr"
```

**Réponse** :
```json
{
  "id": 1,
  "resource_id": "https://data.datatourisme.fr/resource/123",
  "dc_identifier": "CHATEAU_VERSAILLES_001",
  "resource_types": ["PlaceOfInterest", "CulturalSite", "Castle"],
  "name": "Château de Versailles",
  "description": "Ancienne résidence royale française située à Versailles...",
  "location": {
    "type": "Point",
    "coordinates": [2.120355, 48.804865]
  },
  "address": {
    "streetAddress": "Place d'Armes",
    "postalCode": "78000",
    "addressLocality": "Versailles",
    "addressCountry": "FR"
  },
  "available_languages": ["fr", "en", "de", "es"],
  "creation_date": "2024-01-15",
  "opening_hours": [
    {
      "day_of_week": 1,
      "day_name": "Mardi",
      "opens": "09:00:00",
      "closes": "18:30:00",
      "valid_from": "2024-01-01",
      "valid_through": "2024-12-31"
    }
  ],
  "prices": [
    {
      "min_price": 20,
      "max_price": 27,
      "currency": "EUR",
      "price_type": "Plein tarif",
      "description": "Billet d'entrée château + jardins"
    }
  ],
  "media": [
    {
      "url": "https://example.com/versailles-main.jpg",
      "title": "Façade principale du château",
      "mime_type": "image/jpeg",
      "is_main": true,
      "credits": "© Château de Versailles"
    }
  ],
  "created_at": "2024-01-20T10:30:00Z",
  "updated_at": "2024-01-20T15:45:00Z"
}
```

### 3. Recherche par Proximité

**GET** `/api/v1/resources/nearby/`

Recherche des ressources dans un rayon géographique.

**Paramètres requis** :
- `lat` - Latitude (decimal)
- `lng` - Longitude (decimal)

**Paramètres optionnels** :
- `radius` - Rayon en mètres (défaut: 5000)
- `lang` - Langue de réponse

**Exemple de requête** :
```bash
# Recherche autour de Paris (10km)
curl -X GET "http://localhost:8000/api/v1/resources/nearby/?lat=48.8566&lng=2.3522&radius=10000&lang=en"
```

**Réponse** :
```json
{
  "count": 15,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 2,
      "resource_id": "https://data.datatourisme.fr/resource/456",
      "resource_types": ["Museum"],
      "name": "Louvre Museum",
      "description": "World's largest art museum...",
      "location": {
        "type": "Point",
        "coordinates": [2.337644, 48.860611]
      },
      "main_image": "https://example.com/louvre.jpg",
      "price_range": {
        "min": 17,
        "currency": "EUR"
      }
    }
  ]
}
```

### 4. Filtrage par Type

**GET** `/api/v1/resources/by_type/`

Filtre les ressources par type spécifique.

**Paramètres requis** :
- `type` - Type de ressource

**Types courants** :
- `Museum` - Musées
- `Restaurant` - Restaurants
- `Hotel` - Hôtels
- `PlaceOfInterest` - Lieux d'intérêt
- `CulturalSite` - Sites culturels
- `NaturalHeritage` - Patrimoine naturel

**Exemple de requête** :
```bash
curl -X GET "http://localhost:8000/api/v1/resources/by_type/?type=Museum&lang=fr"
```

## 🔤 Gestion des Langues

### Méthodes de Spécification

**1. Paramètre URL (Recommandé)**
```bash
curl "http://localhost:8000/api/v1/resources/?lang=en"
```

**2. Header HTTP**
```bash
curl -H "Accept-Language: en-US,en;q=0.9,fr;q=0.8" \
     "http://localhost:8000/api/v1/resources/"
```

### Comportement de Fallback

1. Si la langue demandée n'est pas disponible → Français
2. Si le contenu n'existe pas dans la langue → Français
3. Si aucune langue spécifiée → Français

**Exemple** :
```json
{
  "name": "Château de Versailles",  // Français par défaut
  "available_languages": ["fr", "en", "de"]
}
```

## 🔍 Recherche et Filtrage

### Recherche Textuelle

**Syntaxe** : `?search={terme}`

**Champs recherchés** :
- Nom de la ressource
- Description
- Types de ressource

**Exemples** :
```bash
# Recherche simple
curl "http://localhost:8000/api/v1/resources/?search=musée"

# Recherche avec plusieurs mots
curl "http://localhost:8000/api/v1/resources/?search=château%20loire"

# Recherche en anglais
curl "http://localhost:8000/api/v1/resources/?search=museum&lang=en"
```

### Tri des Résultats

**Syntaxe** : `?ordering={champ}`

**Champs disponibles** :
- `created_at` - Date de création en base
- `creation_date` - Date de création de la ressource
- `resource_id` - Identifiant de la ressource

**Exemples** :
```bash
# Tri par date (plus récent d'abord)
curl "http://localhost:8000/api/v1/resources/?ordering=-created_at"

# Tri par identifiant (alphabétique)
curl "http://localhost:8000/api/v1/resources/?ordering=resource_id"

# Combinaison recherche + tri
curl "http://localhost:8000/api/v1/resources/?search=paris&ordering=-creation_date"
```

### Pagination

**Structure automatique** :
- **Page size** : 20 résultats par page
- **Navigation** : URLs `next` et `previous`
- **Compteur** : Total des résultats

**Exemple de navigation** :
```bash
# Première page
curl "http://localhost:8000/api/v1/resources/"

# Page spécifique
curl "http://localhost:8000/api/v1/resources/?page=3"
```

## 🗺️ Fonctionnalités Géospatiales

### Coordonnées

**Format** : GeoJSON Point
```json
{
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  }
}
```

**Système de coordonnées** : WGS84 (SRID 4326)

### Calcul de Distance

**Algorithme** : Distance géographique (sphéroïde)
**Unité** : Mètres
**Précision** : ~1 mètre

**Exemple de calcul** :
```python
# Distance Paris - Versailles
# Paris: [2.3522, 48.8566]
# Versailles: [2.1204, 48.8049]
# Distance: ~17,4 km
```

### Recherche Géographique Avancée

**Rayon maximum recommandé** : 50 km
**Performance optimale** : < 10 km
**Limite de résultats** : 1000 par requête

## 📊 Codes de Réponse HTTP

| Code | Signification | Description |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 400 | Bad Request | Paramètres invalides |
| 404 | Not Found | Ressource non trouvée |
| 500 | Server Error | Erreur interne |

### Gestion d'Erreurs

**Format d'erreur standardisé** :
```json
{
  "error": "Les paramètres lat et lng sont requis",
  "code": "missing_parameters",
  "status": 400
}
```

**Erreurs courantes** :
```bash
# Coordonnées manquantes
GET /api/v1/resources/nearby/
→ 400 "Les paramètres lat et lng sont requis"

# Coordonnées invalides
GET /api/v1/resources/nearby/?lat=invalid&lng=2.3522
→ 400 "Paramètres invalides"

# Ressource inexistante
GET /api/v1/resources/99999/
→ 404 "Not found"
```

## 🚀 Exemples d'Intégration

### JavaScript (Fetch)

```javascript
// Recherche de musées à Paris
async function searchMuseumsInParis() {
  const response = await fetch(
    'http://localhost:8000/api/v1/resources/nearby/?lat=48.8566&lng=2.3522&radius=10000'
  );
  
  const data = await response.json();
  
  // Filtrer les musées
  const museums = data.results.filter(resource => 
    resource.resource_types.includes('Museum')
  );
  
  console.log(`${museums.length} musées trouvés`);
  return museums;
}

// Utilisation
searchMuseumsInParis().then(museums => {
  museums.forEach(museum => {
    console.log(`${museum.name}: ${museum.description.substring(0, 100)}...`);
  });
});
```

### Python (Requests)

```python
import requests
from typing import List, Dict

class TourismAPI:
    def __init__(self, base_url: str = "http://localhost:8000/api/v1"):
        self.base_url = base_url
    
    def search_resources(self, search: str = None, lang: str = "fr") -> Dict:
        """Recherche de ressources"""
        params = {"lang": lang}
        if search:
            params["search"] = search
        
        response = requests.get(f"{self.base_url}/resources/", params=params)
        response.raise_for_status()
        return response.json()
    
    def get_nearby(self, lat: float, lng: float, radius: int = 5000, lang: str = "fr") -> List[Dict]:
        """Ressources à proximité"""
        params = {
            "lat": lat,
            "lng": lng,
            "radius": radius,
            "lang": lang
        }
        
        response = requests.get(f"{self.base_url}/resources/nearby/", params=params)
        response.raise_for_status()
        return response.json()["results"]
    
    def get_by_type(self, resource_type: str, lang: str = "fr") -> List[Dict]:
        """Ressources par type"""
        params = {"type": resource_type, "lang": lang}
        
        response = requests.get(f"{self.base_url}/resources/by_type/", params=params)
        response.raise_for_status()
        return response.json()["results"]

# Utilisation
api = TourismAPI()

# Recherche de châteaux
chateaux = api.search_resources(search="château", lang="fr")
print(f"{chateaux['count']} châteaux trouvés")

# Musées près du Louvre
museums = api.get_nearby(lat=48.8606, lng=2.3376, radius=2000)
print(f"{len(museums)} lieux à proximité du Louvre")

# Tous les restaurants
restaurants = api.get_by_type("Restaurant", lang="en")
print(f"{len(restaurants)} restaurants disponibles")
```

### cURL - Scripts Bash

```bash
#!/bin/bash

# Configuration
API_BASE="http://localhost:8000/api/v1"
LANG="fr"

# Fonction de recherche
search_resources() {
    local query="$1"
    local lang="${2:-$LANG}"
    
    curl -s "${API_BASE}/resources/?search=${query}&lang=${lang}" | \
    jq -r '.results[] | "\(.name): \(.resource_types | join(", "))"'
}

# Fonction de recherche géographique
nearby_search() {
    local lat="$1"
    local lng="$2"
    local radius="${3:-5000}"
    
    curl -s "${API_BASE}/resources/nearby/?lat=${lat}&lng=${lng}&radius=${radius}" | \
    jq -r '.results[] | "\(.name) (\(.location.coordinates[1]), \(.location.coordinates[0]))"'
}

# Exemples d'utilisation
echo "=== Recherche de musées ==="
search_resources "musée" "fr"

echo -e "\n=== Lieux près de Paris ==="
nearby_search "48.8566" "2.3522" "10000"
```

## 📈 Optimisation et Performance

### Bonnes Pratiques

1. **Utilisez la pagination** pour les grandes listes
2. **Spécifiez la langue** pour éviter les détections automatiques
3. **Limitez les rayons** de recherche géographique (< 50km)
4. **Implémentez un cache** côté client pour les données statiques

### Limites de Taux

- **Aucune limite** en développement
- **Future implémentation** en production
- **Recommandation** : Max 100 req/min par IP

### Cache Côté Client

```javascript
// Exemple de cache simple
class CachedTourismAPI {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }
    
    async fetchWithCache(url) {
        const cached = this.cache.get(url);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        this.cache.set(url, {
            data: data,
            timestamp: Date.now()
        });
        
        return data;
    }
}
```

## 🔗 Ressources Supplémentaires

- [Référence complète de l'API](../api/endpoints.md)
- [Exemples d'intégration](../examples/integration.md)
- [Guide de déploiement](deployment.md)
- [Dépannage](troubleshooting.md)

L'API est maintenant prête à être utilisée ! Explorez les différents endpoints pour découvrir toutes les possibilités offertes.