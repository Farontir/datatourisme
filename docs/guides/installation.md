# Guide d'Installation

## 🎯 Prérequis

### Systèmes Supportés

- **Linux** : Ubuntu 20.04+, Debian 11+, CentOS 8+
- **macOS** : 11+ (Big Sur)
- **Windows** : 10+ avec WSL2

### Logiciels Requis

| Logiciel | Version Minimale | Recommandé | Notes |
|----------|------------------|------------|-------|
| Docker | 20.10+ | 24.0+ | Obligatoire |
| Docker Compose | 2.0+ | 2.20+ | Obligatoire |
| Python | 3.11+ | 3.11 | Pour développement local |
| PostgreSQL | 15+ | 15+ | Avec PostGIS 3.3+ |
| Git | 2.0+ | 2.40+ | Pour le code source |

## 🚀 Installation Rapide (Docker)

### 1. Cloner le Repository

```bash
# Cloner le projet
git clone <repository-url>
cd datatourisme

# Vérifier la structure
ls -la
```

### 2. Configuration de Base

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer la configuration (optionnel)
nano .env
```

**Contenu du fichier .env** :
```bash
# Django Configuration
SECRET_KEY=your-secret-key-here-generate-with-django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DATABASE_URL=postgis://tourism_user:tourism_pass@localhost:5432/tourism_db

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Démarrage Automatisé

**Option A : Script d'initialisation (Recommandé)**

```bash
# Rendre le script exécutable
chmod +x scripts/init_project.sh

# Lancer l'initialisation complète
./scripts/init_project.sh
```

**Option B : Makefile**

```bash
# Installation complète
make install

# Ou étape par étape
make build
make up
make migrate
```

### 4. Vérification de l'Installation

```bash
# Vérifier les services
docker-compose ps

# Tester l'API
curl http://localhost:8000/api/v1/resources/

# Accéder à l'interface
open http://localhost:8000/admin/
```

## 🔧 Installation Manuelle (Développement)

### 1. Installation des Dépendances Système

**Ubuntu/Debian** :
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances
sudo apt install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    postgresql-15 \
    postgresql-15-postgis-3 \
    gdal-bin \
    libgdal-dev \
    build-essential \
    git
```

**macOS** :
```bash
# Avec Homebrew
brew install python@3.11 postgresql postgis gdal

# Démarrer PostgreSQL
brew services start postgresql
```

### 2. Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

-- Créer la base de données
CREATE DATABASE tourism_db;
CREATE USER tourism_user WITH PASSWORD 'tourism_pass';
GRANT ALL PRIVILEGES ON DATABASE tourism_db TO tourism_user;

-- Activer PostGIS
\c tourism_db;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;

-- Vérifier l'installation
SELECT PostGIS_Version();
```

### 3. Configuration Python

```bash
# Créer l'environnement virtuel
python3.11 -m venv venv

# Activer l'environnement
source venv/bin/activate  # Linux/macOS
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configuration Django

```bash
# Variables d'environnement
export SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_string; print(get_random_string(50))')"
export DEBUG=True
export DATABASE_URL="postgis://tourism_user:tourism_pass@localhost:5432/tourism_db"

# Migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser

# Collecter les fichiers statiques
python manage.py collectstatic

# Démarrer le serveur
python manage.py runserver
```

## 📊 Import de Données de Test

### 1. Données d'Exemple

```bash
# Importer les données de test
python manage.py import_jsonld data/sample.json

# Ou importer tous les fichiers JSON
for file in data/*.json; do
    python manage.py import_jsonld "$file"
done
```

### 2. Vérification de l'Import

```bash
# Vérifier le nombre de ressources
python manage.py shell -c "
from tourism.models import TouristicResource
print(f'Ressources importées: {TouristicResource.objects.count()}')
"

# Vérifier la qualité des données
python manage.py check_data_quality
```

## 🐳 Configuration Docker Avancée

### 1. Configuration de Production

**docker-compose.prod.yml** :
```yaml
version: '3.8'

services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  web:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
    volumes:
      - static_volume:/code/staticfiles
      - media_volume:/code/media
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/var/www/static
      - media_volume:/var/www/media
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

### 2. Configuration Nginx

**nginx.conf** :
```nginx
events {
    worker_connections 1024;
}

http {
    upstream django {
        server web:8000;
    }

    server {
        listen 80;
        server_name localhost;

        location /static/ {
            alias /var/www/static/;
        }

        location /media/ {
            alias /var/www/media/;
        }

        location / {
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## 🔧 Dépannage de l'Installation

### Problèmes Courants

**1. Erreur PostGIS**
```bash
# Erreur: could not load library "postgis-3"
sudo apt install postgresql-15-postgis-3-scripts

# Ou réinstaller PostGIS
sudo apt remove --purge postgresql-15-postgis-3
sudo apt install postgresql-15-postgis-3
```

**2. Erreur GDAL**
```bash
# Erreur: GDAL library not found
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal

# Ou installer manuellement
sudo apt install libgdal-dev gdal-bin
```

**3. Erreur Docker**
```bash
# Permission denied sur Docker
sudo usermod -aG docker $USER
newgrp docker

# Ou redémarrer Docker
sudo systemctl restart docker
```

**4. Erreur de Migration**
```bash
# Supprimer et recréer la base
python manage.py flush --noinput
python manage.py migrate

# Ou reset complet
docker-compose down -v
docker-compose up -d
```

### Logs de Debug

```bash
# Logs Docker
docker-compose logs -f

# Logs Django
python manage.py runserver --verbosity=2

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

## ✅ Tests de Validation

### 1. Tests Automatisés

```bash
# Lancer tous les tests
python manage.py test

# Tests avec coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### 2. Tests Manuels

```bash
# API Health Check
curl -f http://localhost:8000/api/v1/resources/ || echo "API DOWN"

# Database Connection
python manage.py dbshell -c "SELECT version();"

# PostGIS Check
python manage.py shell -c "
from django.contrib.gis.geos import Point
print('PostGIS OK' if Point(0, 0) else 'PostGIS ERROR')
"
```

### 3. Tests de Performance

```bash
# Test de charge basique
for i in {1..100}; do
    curl -s http://localhost:8000/api/v1/resources/ > /dev/null &
done
wait

# Monitoring des ressources
docker stats
```

## 📋 Checklist d'Installation

- [ ] Docker et Docker Compose installés
- [ ] Repository cloné
- [ ] Fichier .env configuré
- [ ] Services Docker démarrés
- [ ] Base de données migrée
- [ ] Données de test importées
- [ ] API accessible sur http://localhost:8000
- [ ] Admin accessible sur http://localhost:8000/admin
- [ ] Tests passent avec succès

## 🔗 Étapes Suivantes

1. [Utilisation de l'API](api-usage.md)
2. [Guide de déploiement](deployment.md)
3. [Configuration avancée](../technical/)

## 🆘 Support

En cas de problème :

1. Consultez la [section dépannage](troubleshooting.md)
2. Vérifiez les [logs de l'application](#logs-de-debug)
3. Consultez les [issues GitHub](https://github.com/project/issues)

L'installation est maintenant terminée ! Votre application de tourisme Django est prête à utiliser.