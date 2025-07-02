# Application Tourisme Django

Application de gestion de ressources touristiques avec support JSON-LD et recherche géospatiale.

## 🚀 Démarrage Rapide

### Prérequis

- Docker et Docker Compose
- Python 3.11+ (pour le développement local)
- Git

### Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd tourism_project
```

2. Configuration
```bash
cp .env.example .env
# Éditer .env si nécessaire
```

3. Démarrage avec Docker
```bash
chmod +x scripts/init_project.sh
./scripts/init_project.sh
```

Ou avec Make:
```bash
make install
```

### Accès

- 🌐 Application: http://localhost:8000
- 👤 Admin Django: http://localhost:8000/admin (admin/admin123)
- 📚 API Documentation: http://localhost:8000/api/docs/
- 🔌 API Endpoints: http://localhost:8000/api/v1/

## 📋 Fonctionnalités

- ✅ Import de données JSON-LD
- ✅ API REST avec support multilingue
- ✅ Recherche géospatiale avec PostGIS
- ✅ Administration Django
- ✅ Documentation OpenAPI/Swagger
- ✅ Support Docker

## 🛠️ Développement

### Structure du Projet

```
tourism_project/
├── api/                # Application API
├── core/              # Utilitaires et middleware
├── tourism/           # Application principale
├── data/              # Données de test
├── scripts/           # Scripts utilitaires
└── tourism_project/   # Configuration Django
```

### Commandes Utiles

```bash
# Lancer les tests
make test

# Ouvrir un shell Django
make shell

# Voir les logs
make logs

# Importer des données
make import

# Vérifier la qualité des données
make quality
```

### Tests

```bash
# Tests unitaires
docker-compose exec web python manage.py test

# Tests avec coverage
docker-compose exec web coverage run --source='.' manage.py test
docker-compose exec web coverage report
```

## 📡 API

### Endpoints Principaux

- `GET /api/v1/resources/` - Liste des ressources
- `GET /api/v1/resources/{id}/` - Détail d'une ressource
- `GET /api/v1/resources/nearby/` - Recherche géographique
- `GET /api/v1/resources/by_type/` - Filtrage par type

### Paramètres

- `lang` - Langue (fr, en, de, es, it, nl)
- `search` - Recherche textuelle
- `page` - Pagination
- `ordering` - Tri des résultats

### Exemple

```bash
# Recherche en anglais
curl "http://localhost:8000/api/v1/resources/?lang=en"

# Recherche géographique
curl "http://localhost:8000/api/v1/resources/nearby/?lat=45.0&lng=1.0&radius=5000"
```

## 🐳 Docker

### Commandes Docker

```bash
# Construire les images
docker-compose build

# Démarrer les services
docker-compose up -d

# Arrêter les services
docker-compose down

# Voir les logs
docker-compose logs -f

# Exécuter une commande Django
docker-compose exec web python manage.py <command>
```

## 📚 Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [PostGIS Documentation](https://postgis.net/documentation/)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.