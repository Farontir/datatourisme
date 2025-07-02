# Guide de Déploiement

## 🎯 Vue d'ensemble

Ce guide couvre le déploiement de l'application de tourisme Django en environnement de production.

### Environnements Supportés

- **Développement** : Docker local avec auto-reload
- **Staging** : Réplique de production pour tests
- **Production** : Configuration optimisée et sécurisée

## 🚀 Déploiement Rapide (Docker)

### 1. Préparation du Serveur

**Prérequis système** :
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git nginx certbot

# Démarrage automatique
sudo systemctl enable docker
sudo systemctl start docker

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
```

### 2. Configuration de Production

**Créer docker-compose.prod.yml** :
```yaml
version: '3.8'

services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: ${DB_NAME:-tourism_db}
      POSTGRES_USER: ${DB_USER:-tourism_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - tourism_network

  web:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgis://${DB_USER:-tourism_user}:${DB_PASSWORD}@db:5432/${DB_NAME:-tourism_db}
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
    volumes:
      - static_volume:/code/staticfiles
      - media_volume:/code/media
    depends_on:
      - db
    restart: unless-stopped
    networks:
      - tourism_network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - static_volume:/var/www/static
      - media_volume:/var/www/media
      - certbot_webroot:/var/www/certbot
    depends_on:
      - web
    restart: unless-stopped
    networks:
      - tourism_network

volumes:
  postgres_data:
  static_volume:
  media_volume:
  certbot_webroot:

networks:
  tourism_network:
    driver: bridge
```

### 3. Configuration des Variables d'Environnement

**Créer .env.prod** :
```bash
# Django Configuration
SECRET_KEY=your-super-secret-production-key-50-characters-long
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database Configuration
DB_NAME=tourism_db
DB_USER=tourism_user
DB_PASSWORD=super-secure-database-password

# Security
SECURE_SSL_REDIRECT=True
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. Dockerfile de Production

**Créer Dockerfile.prod** :
```dockerfile
FROM python:3.11-slim

# Variables d'environnement
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=tourism_project.settings.production

WORKDIR /code

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Variables GDAL
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code
COPY . .

# Création des répertoires
RUN mkdir -p /code/staticfiles /code/media

# Collection des fichiers statiques
RUN python manage.py collectstatic --noinput

# Utilisateur non-root pour la sécurité
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /code
USER app

EXPOSE 8000

# Commande de production
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "tourism_project.wsgi:application"]
```

## 🔧 Configuration Nginx

### 1. Configuration de Base

**nginx/nginx.conf** :
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    upstream django {
        server web:8000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Let's Encrypt verification
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS configuration
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=63072000" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        location /media/ {
            alias /var/www/media/;
            expires 1d;
            add_header Cache-Control "public";
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Admin interface
        location /admin/ {
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main application
        location / {
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 🔒 Configuration SSL avec Let's Encrypt

### 1. Installation de Certbot

```bash
# Installation
sudo apt install certbot python3-certbot-nginx

# Ou avec Docker
docker run -it --rm --name certbot \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    -d yourdomain.com -d www.yourdomain.com
```

### 2. Renouvellement Automatique

**Créer un script de renouvellement** :
```bash
#!/bin/bash
# /opt/tourism/renew-ssl.sh

# Renouvellement
docker run --rm --name certbot \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot renew --quiet

# Recharger Nginx si certificat renouvelé
if [ $? -eq 0 ]; then
    docker-compose -f /opt/tourism/docker-compose.prod.yml exec nginx nginx -s reload
fi
```

**Crontab pour renouvellement** :
```bash
# Ajouter à crontab
crontab -e

# Renouvellement tous les dimanche à 3h
0 3 * * 0 /opt/tourism/renew-ssl.sh
```

## 🗄️ Configuration Base de Données Production

### 1. Optimisation PostgreSQL

**postgresql.conf** optimisations :
```ini
# Connexions
max_connections = 100

# Mémoire
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Logs
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on

# Autovacuum
autovacuum = on
autovacuum_max_workers = 3
```

### 2. Sauvegarde Automatique

**Script de sauvegarde** :
```bash
#!/bin/bash
# /opt/tourism/backup-db.sh

DB_NAME="tourism_db"
BACKUP_DIR="/opt/tourism/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le répertoire si nécessaire
mkdir -p $BACKUP_DIR

# Sauvegarde complète
docker-compose -f /opt/tourism/docker-compose.prod.yml exec -T db \
    pg_dump -U tourism_user -d $DB_NAME | \
    gzip > $BACKUP_DIR/tourism_${DATE}.sql.gz

# Nettoyer les anciennes sauvegardes (> 30 jours)
find $BACKUP_DIR -name "tourism_*.sql.gz" -mtime +30 -delete

echo "Sauvegarde terminée: tourism_${DATE}.sql.gz"
```

**Crontab pour sauvegardes** :
```bash
# Sauvegarde quotidienne à 2h
0 2 * * * /opt/tourism/backup-db.sh
```

## 📊 Monitoring et Logs

### 1. Configuration des Logs

**settings/production.py** :
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/code/logs/django.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'ERROR',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
        'tourism': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

### 2. Health Checks

**health_check.py** :
```python
#!/usr/bin/env python3
import requests
import sys
import json

def check_api():
    try:
        response = requests.get('https://yourdomain.com/api/v1/resources/', timeout=10)
        return response.status_code == 200
    except:
        return False

def check_admin():
    try:
        response = requests.get('https://yourdomain.com/admin/', timeout=10)
        return response.status_code in [200, 302]
    except:
        return False

def main():
    checks = {
        'api': check_api(),
        'admin': check_admin(),
    }
    
    all_ok = all(checks.values())
    
    print(json.dumps({
        'status': 'healthy' if all_ok else 'unhealthy',
        'checks': checks
    }))
    
    sys.exit(0 if all_ok else 1)

if __name__ == '__main__':
    main()
```

## 🚀 Script de Déploiement Automatisé

**deploy.sh** :
```bash
#!/bin/bash
set -e

# Configuration
PROJECT_DIR="/opt/tourism"
DOCKER_COMPOSE="docker-compose -f docker-compose.prod.yml"

echo "🚀 Déploiement de l'application Tourism..."

# 1. Sauvegarde de la base de données
echo "📦 Sauvegarde de la base de données..."
$PROJECT_DIR/backup-db.sh

# 2. Arrêt des services
echo "⏹️  Arrêt des services..."
cd $PROJECT_DIR
$DOCKER_COMPOSE down

# 3. Mise à jour du code
echo "📥 Mise à jour du code..."
git pull origin main

# 4. Construction des images
echo "🔨 Construction des images..."
$DOCKER_COMPOSE build --no-cache

# 5. Démarrage des services
echo "▶️  Démarrage des services..."
$DOCKER_COMPOSE up -d

# 6. Attendre que la base soit prête
echo "⏳ Attente de la base de données..."
until $DOCKER_COMPOSE exec -T db pg_isready -U tourism_user -d tourism_db; do
    sleep 2
done

# 7. Migrations
echo "🔄 Application des migrations..."
$DOCKER_COMPOSE exec -T web python manage.py migrate

# 8. Collection des fichiers statiques
echo "📁 Collection des fichiers statiques..."
$DOCKER_COMPOSE exec -T web python manage.py collectstatic --noinput

# 9. Test de santé
echo "🏥 Test de santé..."
sleep 10
if python3 /opt/tourism/health_check.py; then
    echo "✅ Déploiement réussi!"
else
    echo "❌ Échec du déploiement"
    exit 1
fi

echo "🎉 Déploiement terminé avec succès!"
```

## 📋 Checklist de Déploiement

### Pré-déploiement
- [ ] Serveur configuré avec Docker
- [ ] Domaine pointant vers le serveur
- [ ] Certificats SSL configurés
- [ ] Variables d'environnement définies
- [ ] Sauvegardes planifiées

### Déploiement
- [ ] Code mis à jour
- [ ] Images Docker construites
- [ ] Services démarrés
- [ ] Migrations appliquées
- [ ] Fichiers statiques collectés

### Post-déploiement
- [ ] Health checks passent
- [ ] API accessible
- [ ] Admin accessible
- [ ] Logs fonctionnels
- [ ] Monitoring actif

## 🔧 Dépannage

### Problèmes Courants

**1. Erreur SSL**
```bash
# Vérifier les certificats
docker-compose exec nginx nginx -t

# Renouveler SSL
/opt/tourism/renew-ssl.sh
```

**2. Erreur de Base**
```bash
# Vérifier la connexion
docker-compose exec db psql -U tourism_user -d tourism_db -c "SELECT version();"

# Restaurer une sauvegarde
gunzip -c /opt/tourism/backups/tourism_20240120_020000.sql.gz | \
docker-compose exec -T db psql -U tourism_user -d tourism_db
```

**3. Performance**
```bash
# Vérifier les ressources
docker stats

# Logs détaillés
docker-compose logs -f web
```

## 🔮 Évolutions Futures

### Phase 2 - Améliorations Prévues

1. **Container orchestration** : Kubernetes
2. **Cache distribué** : Redis cluster
3. **Load balancing** : HAProxy
4. **Monitoring avancé** : Prometheus + Grafana
5. **CI/CD** : GitLab CI ou GitHub Actions

Votre application est maintenant prête pour la production ! 🎉