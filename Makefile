.PHONY: help build up down logs shell test clean

# Variables
DOCKER_COMPOSE = docker-compose
DJANGO_MANAGE = $(DOCKER_COMPOSE) exec web python manage.py

# Par défaut, afficher l'aide
help:
	@echo "Commandes disponibles:"
	@echo "  make build      - Construire les images Docker"
	@echo "  make up         - Démarrer les conteneurs"
	@echo "  make down       - Arrêter les conteneurs"
	@echo "  make logs       - Afficher les logs"
	@echo "  make shell      - Ouvrir un shell Django"
	@echo "  make test       - Lancer les tests"
	@echo "  make migrate    - Appliquer les migrations"
	@echo "  make clean      - Nettoyer les fichiers temporaires"
	@echo "  make import     - Importer les données de test"
	@echo "  make quality    - Vérifier la qualité des données"

# Construction
build:
	$(DOCKER_COMPOSE) build

# Démarrage
up:
	$(DOCKER_COMPOSE) up -d
	@echo "Application disponible sur http://localhost:8000"

# Arrêt
down:
	$(DOCKER_COMPOSE) down

# Logs
logs:
	$(DOCKER_COMPOSE) logs -f

# Shell Django
shell:
	$(DJANGO_MANAGE) shell

# Tests
test:
	$(DJANGO_MANAGE) test

# Migrations
migrate:
	$(DJANGO_MANAGE) migrate

makemigrations:
	$(DJANGO_MANAGE) makemigrations

# Import de données
import:
	$(DJANGO_MANAGE) import_jsonld data/sample.json

# Qualité des données
quality:
	$(DJANGO_MANAGE) check_data_quality

# Nettoyage
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .coverage htmlcov/

# Installation complète
install: build up migrate
	$(DJANGO_MANAGE) createsuperuser --noinput || true
	$(DJANGO_MANAGE) collectstatic --noinput
	@echo "Installation terminée!"