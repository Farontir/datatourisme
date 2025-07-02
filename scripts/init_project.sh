#!/bin/bash

set -e  # Exit on error

echo "🚀 Initialisation du projet Tourism..."
echo "====================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé. Veuillez installer Docker et Docker Compose."
    exit 1
fi

# Vérifier si .env existe
if [ ! -f .env ]; then
    log_info "Création du fichier .env..."
    cp .env.example .env
    
    # Générer une clé secrète
    SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_string; print(get_random_string(50))')
    
    # Remplacer la clé dans le fichier .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-secret-key-here-generate-with-django/$SECRET_KEY/g" .env
    else
        # Linux
        sed -i "s/your-secret-key-here-generate-with-django/$SECRET_KEY/g" .env
    fi
    
    log_info "Fichier .env créé avec succès"
else
    log_warn "Le fichier .env existe déjà"
fi

# Créer les répertoires nécessaires
log_info "Création des répertoires..."
mkdir -p data media staticfiles

# Construire les images
log_info "Construction des images Docker..."
docker-compose build

# Démarrer les conteneurs
log_info "Démarrage des conteneurs..."
docker-compose up -d

# Attendre que PostgreSQL soit prêt
log_info "Attente de PostgreSQL..."
max_retries=30
counter=0
until docker-compose exec -T db pg_isready -U tourism_user -d tourism_db > /dev/null 2>&1; do
    counter=$((counter+1))
    if [ $counter -gt $max_retries ]; then
        log_error "PostgreSQL n'a pas démarré après $max_retries tentatives"
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""
log_info "PostgreSQL est prêt!"

# Appliquer les migrations
log_info "Application des migrations..."
docker-compose exec -T web python manage.py migrate

# Créer le superuser si nécessaire
log_info "Création du superuser..."
docker-compose exec -T web python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('Superuser créé: admin / admin123')
else:
    print('Superuser existe déjà')
"

# Collecter les fichiers statiques
log_info "Collecte des fichiers statiques..."
docker-compose exec -T web python manage.py collectstatic --noinput

# Importer les données de test si disponibles
if [ -f data/sample.json ]; then
    log_info "Import des données de test..."
    docker-compose exec -T web python manage.py import_jsonld data/sample.json
else
    log_warn "Aucun fichier de données de test trouvé (data/sample.json)"
fi

# Vérifier l'état des services
log_info "Vérification des services..."
docker-compose ps

# Afficher les informations de connexion
echo ""
echo "====================================="
echo -e "${GREEN}✅ Projet initialisé avec succès!${NC}"
echo "====================================="
echo ""
echo "📋 Informations de connexion:"
echo "  - Application: http://localhost:8000"
echo "  - Admin: http://localhost:8000/admin"
echo "  - API: http://localhost:8000/api/v1/resources/"
echo "  - Documentation: http://localhost:8000/api/docs/"
echo ""
echo "👤 Identifiants admin:"
echo "  - Username: admin"
echo "  - Password: admin123"
echo ""
echo "🐳 Commandes utiles:"
echo "  - Logs: docker-compose logs -f"
echo "  - Shell Django: docker-compose exec web python manage.py shell"
echo "  - Arrêter: docker-compose down"
echo ""