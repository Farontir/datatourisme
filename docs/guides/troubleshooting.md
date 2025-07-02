# Guide de Dépannage

## 🎯 Approche Méthodique

Ce guide vous aide à diagnostiquer et résoudre les problèmes courants de l'application de tourisme Django.

### Stratégie de Debug

1. **Identifier** le symptôme
2. **Localiser** la source du problème
3. **Analyser** les logs et erreurs
4. **Tester** les solutions
5. **Valider** la résolution

## 🚨 Problèmes de Démarrage

### 1. Docker ne démarre pas

**Symptômes** :
- `docker-compose up` échoue
- Conteneurs qui s'arrêtent immédiatement
- Erreurs de port ou de volume

**Diagnostic** :
```bash
# Vérifier l'état des conteneurs
docker-compose ps

# Voir les logs détaillés
docker-compose logs

# Vérifier les ports utilisés
netstat -tulpn | grep :8000
netstat -tulpn | grep :5432
```

**Solutions** :

**Problème de port** :
```bash
# Changer le port dans docker-compose.yml
ports:
  - "8001:8000"  # Au lieu de 8000:8000
```

**Problème de permissions** :
```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker

# Redémarrer Docker
sudo systemctl restart docker
```

**Problème de volume** :
```bash
# Nettoyer les volumes
docker-compose down -v
docker volume prune

# Recréer les volumes
docker-compose up -d
```

### 2. Base de Données Non Accessible

**Symptômes** :
- `FATAL: database "tourism_db" does not exist`
- `connection refused`
- Timeouts de connexion

**Diagnostic** :
```bash
# Vérifier le conteneur PostgreSQL
docker-compose logs db

# Tester la connexion
docker-compose exec db psql -U tourism_user -d tourism_db

# Vérifier PostGIS
docker-compose exec db psql -U tourism_user -d tourism_db -c "SELECT PostGIS_Version();"
```

**Solutions** :

**Base manquante** :
```bash
# Recréer la base
docker-compose exec db createdb -U tourism_user tourism_db

# Activer PostGIS
docker-compose exec db psql -U tourism_user -d tourism_db -c "CREATE EXTENSION postgis;"
```

**Problème de connexion** :
```bash
# Vérifier les variables d'environnement
echo $DATABASE_URL

# Attendre que PostgreSQL soit prêt
until docker-compose exec db pg_isready -U tourism_user; do sleep 1; done
```

### 3. Erreurs de Migration

**Symptômes** :
- `django.db.utils.ProgrammingError`
- `Migration dependencies`
- `Table already exists`

**Diagnostic** :
```bash
# Vérifier l'état des migrations
python manage.py showmigrations

# Voir les migrations en attente
python manage.py migrate --plan
```

**Solutions** :

**Reset complet** :
```bash
# ATTENTION: Supprime toutes les données
python manage.py flush --noinput
python manage.py migrate
```

**Migration sélective** :
```bash
# Revenir à une migration spécifique
python manage.py migrate tourism 0001_initial

# Puis migrer normalement
python manage.py migrate
```

**Fausse migration** :
```bash
# Marquer une migration comme appliquée
python manage.py migrate --fake tourism 0001_initial
```

## 🌐 Problèmes d'API

### 1. API Non Accessible

**Symptômes** :
- 404 sur `/api/v1/resources/`
- 500 Internal Server Error
- Timeouts

**Diagnostic** :
```bash
# Tester l'API directement
curl -v http://localhost:8000/api/v1/resources/

# Vérifier les URLs
python manage.py show_urls | grep api

# Voir les logs Django
docker-compose logs web
```

**Solutions** :

**Problème de routing** :
```python
# Vérifier tourism_project/urls.py
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # Cette ligne doit être présente
]
```

**Problème CORS** :
```python
# Ajouter à settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = True  # Pour le développement uniquement
```

### 2. Réponses Vides ou Incorrectes

**Symptômes** :
- `{"count": 0, "results": []}`
- Données manquantes
- Erreurs de sérialisation

**Diagnostic** :
```bash
# Vérifier les données en base
python manage.py shell -c "
from tourism.models import TouristicResource
print(f'Total: {TouristicResource.objects.count()}')
print(f'Actives: {TouristicResource.objects.filter(is_active=True).count()}')
"

# Tester les requêtes
python manage.py shell -c "
from tourism.models import TouristicResource
resources = TouristicResource.objects.all()[:5]
for r in resources:
    print(f'{r.id}: {r.get_name(\"fr\")} - Active: {r.is_active}')
"
```

**Solutions** :

**Ressources inactives** :
```python
# Activer toutes les ressources
python manage.py shell -c "
from tourism.models import TouristicResource
TouristicResource.objects.update(is_active=True)
print('Toutes les ressources sont maintenant actives')
"
```

**Problème de language** :
```bash
# Tester avec langue explicite
curl "http://localhost:8000/api/v1/resources/?lang=fr"
```

### 3. Erreurs de Géolocalisation

**Symptômes** :
- Erreur sur `/api/v1/resources/nearby/`
- `GEOS_ERROR` ou `GDAL_ERROR`
- Coordonnées invalides

**Diagnostic** :
```bash
# Vérifier GDAL
python -c "from django.contrib.gis.geos import Point; print(Point(0, 0))"

# Tester PostGIS
docker-compose exec db psql -U tourism_user -d tourism_db -c "
SELECT ST_Distance(
    ST_GeogFromText('POINT(0 0)'),
    ST_GeogFromText('POINT(1 1)')
);"
```

**Solutions** :

**Installer GDAL** :
```bash
# Ubuntu/Debian
sudo apt install gdal-bin libgdal-dev

# Variables d'environnement
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
```

**Coordonnées invalides** :
```bash
# Tester avec coordonnées valides
curl "http://localhost:8000/api/v1/resources/nearby/?lat=48.8566&lng=2.3522&radius=5000"
```

## 🔍 Problèmes d'Import de Données

### 1. Erreurs d'Import JSON-LD

**Symptômes** :
- `json.JSONDecodeError`
- `KeyError` sur des champs obligatoires
- Import partiel

**Diagnostic** :
```bash
# Valider le JSON
python -m json.tool data/sample.json

# Import avec debug
python manage.py import_jsonld data/sample.json --verbosity=2

# Vérifier les erreurs
python manage.py shell -c "
from tourism.services import JsonLdImportService
service = JsonLdImportService()
print(service.errors)
"
```

**Solutions** :

**JSON invalide** :
```bash
# Réparer le JSON avec jq
jq . data/sample.json > data/sample_fixed.json
```

**Champs manquants** :
```python
# Ajouter des valeurs par défaut dans le service
def import_resource(self, json_data):
    # Valeurs par défaut
    json_data.setdefault('@id', 'unknown')
    json_data.setdefault('dc:identifier', 'unknown')
    # ... continuer l'import
```

### 2. Problèmes de Performance Import

**Symptômes** :
- Import très lent
- Timeouts
- Mémoire insuffisante

**Diagnostic** :
```bash
# Surveiller les ressources
docker stats

# Profiler l'import
python -m cProfile manage.py import_jsonld data/large_file.json
```

**Solutions** :

**Import par batch** :
```python
# Modifier le service pour traiter par lots
def import_batch(self, json_list, batch_size=100):
    for i in range(0, len(json_list), batch_size):
        batch = json_list[i:i+batch_size]
        with transaction.atomic():
            for item in batch:
                self.import_resource(item)
```

**Optimiser la base** :
```sql
-- Désactiver temporairement les index
DROP INDEX tourism_touristicresource_data_gin_idx;

-- Après import, recréer les index
CREATE INDEX tourism_touristicresource_data_gin_idx 
ON tourism_touristicresource USING GIN (data);
```

## 🖥️ Problèmes d'Interface Admin

### 1. Admin Non Accessible

**Symptômes** :
- 404 sur `/admin/`
- Erreurs de login
- Styles CSS manquants

**Diagnostic** :
```bash
# Vérifier les URLs admin
python manage.py shell -c "
from django.urls import reverse
print(reverse('admin:index'))
"

# Vérifier les fichiers statiques
python manage.py collectstatic --dry-run
```

**Solutions** :

**Collecter les statiques** :
```bash
python manage.py collectstatic --noinput
```

**Créer un superuser** :
```bash
python manage.py createsuperuser
```

### 2. Problèmes de Cartes OSM

**Symptômes** :
- Cartes ne s'affichent pas
- Erreurs JavaScript
- Points non visibles

**Diagnostic** :
```bash
# Vérifier les médias
ls -la media/

# Tester avec un point connu
python manage.py shell -c "
from tourism.models import TouristicResource
from django.contrib.gis.geos import Point
r = TouristicResource.objects.first()
if r and r.location:
    print(f'Point: {r.location.x}, {r.location.y}')
else:
    print('Aucun point trouvé')
"
```

**Solutions** :

**Ajouter des coordonnées de test** :
```python
python manage.py shell -c "
from tourism.models import TouristicResource
from django.contrib.gis.geos import Point
# Paris - Louvre
resource = TouristicResource.objects.first()
if resource:
    resource.location = Point(2.337644, 48.860611)
    resource.save()
    print('Coordonnées ajoutées')
"
```

## 🔧 Problèmes de Configuration

### 1. Variables d'Environnement

**Symptômes** :
- `KeyError` sur `SECRET_KEY`
- Configurations non appliquées
- Erreurs de type

**Diagnostic** :
```bash
# Vérifier les variables
printenv | grep -E "(SECRET_KEY|DEBUG|DATABASE_URL)"

# Tester la config Django
python manage.py shell -c "
from django.conf import settings
print(f'DEBUG: {settings.DEBUG}')
print(f'DATABASE: {settings.DATABASES[\"default\"][\"NAME\"]}')
"
```

**Solutions** :

**Créer .env manquant** :
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

**Générer SECRET_KEY** :
```bash
python manage.py generate_secret_key
```

### 2. Problèmes de Cache

**Symptômes** :
- Données obsolètes
- Erreurs de sérialisation
- Performance dégradée

**Diagnostic** :
```bash
# Vérifier la config cache
python manage.py shell -c "
from django.core.cache import cache
cache.set('test', 'value')
print(cache.get('test'))
"
```

**Solutions** :

**Vider le cache** :
```bash
python manage.py shell -c "
from django.core.cache import cache
cache.clear()
print('Cache vidé')
"
```

## 📊 Outils de Debug

### 1. Logs Détaillés

**Configuration de logging** :
```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'DEBUG',
    },
}
```

### 2. Shell Django Interactif

**Sessions de debug utiles** :
```python
# Analyser les données
python manage.py shell
>>> from tourism.models import *
>>> TouristicResource.objects.count()
>>> list(TouristicResource.objects.values_list('resource_types', flat=True).distinct())

# Tester les serializers
>>> from tourism.serializers import *
>>> from tourism.models import TouristicResource
>>> resource = TouristicResource.objects.first()
>>> serializer = TouristicResourceDetailSerializer(resource, context={'language': 'fr'})
>>> serializer.data
```

### 3. Tests de Régression

**Script de validation** :
```bash
#!/bin/bash
# test_health.sh

echo "🧪 Tests de santé de l'application"

# 1. Test API
echo "📡 Test API..."
if curl -f http://localhost:8000/api/v1/resources/ > /dev/null 2>&1; then
    echo "✅ API OK"
else
    echo "❌ API KO"
fi

# 2. Test base de données
echo "🗄️  Test base de données..."
if python manage.py shell -c "from tourism.models import TouristicResource; print(TouristicResource.objects.count())" > /dev/null 2>&1; then
    echo "✅ Base OK"
else
    echo "❌ Base KO"
fi

# 3. Test import
echo "📥 Test import..."
if python manage.py import_jsonld data/sample.json > /dev/null 2>&1; then
    echo "✅ Import OK"
else
    echo "❌ Import KO"
fi
```

## 📋 Checklist de Dépannage

### Vérifications Initiales
- [ ] Docker et services démarrés
- [ ] Variables d'environnement définies
- [ ] Base de données accessible
- [ ] Migrations appliquées

### Problèmes API
- [ ] URLs correctement configurées
- [ ] CORS autorisé
- [ ] Données présentes en base
- [ ] Serializers fonctionnels

### Problèmes Data
- [ ] JSON-LD valide
- [ ] PostGIS opérationnel
- [ ] Import réussi
- [ ] Index créés

### Problèmes Admin
- [ ] Fichiers statiques collectés
- [ ] Superuser créé
- [ ] Permissions correctes
- [ ] OSM maps fonctionnelles

## 🆘 Demander de l'Aide

### Informations à Fournir

1. **Version du système** : `uname -a`
2. **Version Docker** : `docker --version`
3. **Logs complets** : `docker-compose logs`
4. **Configuration** : `.env` (sans mots de passe)
5. **Étapes de reproduction** du problème

### Ressources Utiles

- [Issues GitHub](https://github.com/project/issues)
- [Documentation Django](https://docs.djangoproject.com/)
- [Documentation PostGIS](https://postgis.net/documentation/)
- [Django REST Framework](https://www.django-rest-framework.org/)

En cas de problème persistant, n'hésitez pas à créer une issue avec tous les détails nécessaires !