# Documentation Application Tourisme Django

Bienvenue dans la documentation technique de l'application de gestion de ressources touristiques.

## 📚 Table des Matières

### 🏗️ Architecture
- [Vue d'ensemble](architecture/overview.md) - Architecture générale et évolution distribuée
- [Services distribués](architecture/distributed-services.md) - Redis, Elasticsearch, Celery, WebSockets
- [Modèles de données](architecture/models.md) - Documentation des modèles Django
- [Conception API](architecture/api-design.md) - Design de l'API REST
- [Schéma de base de données](architecture/database-schema.md) - Structure PostGIS

### 📖 Guides d'Utilisation
- [Installation](guides/installation.md) - Installation et configuration
- [Utilisation API](guides/api-usage.md) - Guide d'utilisation de l'API
- [Déploiement](guides/deployment.md) - Déploiement en production
- [Dépannage](guides/troubleshooting.md) - Résolution des problèmes

### 🔌 Référence API
- [Endpoints](api/endpoints.md) - Documentation des endpoints REST
- [GraphQL API](api/graphql-api.md) - API GraphQL flexible et performante
- [Authentification](api/authentication.md) - Authentification et permissions
- [Exemples](api/examples.md) - Exemples d'utilisation
- [Spécification OpenAPI](api/openapi-spec.md) - Spécification complète

### ⚙️ Documentation Technique
- [Service d'import](technical/import-service.md) - Import JSON-LD
- [Multilangue](technical/multilingual.md) - Gestion multilingue
- [Géospatial](technical/geospatial.md) - Fonctionnalités PostGIS
- [Cache intelligent](technical/caching.md) - Système de cache Redis avancé
- [Moteur de recherche](technical/search.md) - Elasticsearch et recherche avancée
- [Traitement asynchrone](technical/async-processing.md) - Celery et tâches background
- [Communication temps réel](technical/realtime.md) - WebSockets et notifications

### 👩‍💻 Développement
- [Tests](development/testing.md) - Guide des tests
- [Commandes](development/commands.md) - Commandes de gestion
- [Contribution](development/contributing.md) - Guide de contribution
- [Standards](development/code-style.md) - Standards de code

### 💡 Exemples et Tutoriels
- [Données JSON-LD](examples/json-ld-samples.md) - Exemples de données
- [Intégration](examples/integration.md) - Exemples d'intégration
- [Frontend](examples/frontend.md) - Exemples côté client

## 🚀 Démarrage Rapide

1. **Installation** : Consultez le [guide d'installation](guides/installation.md)
2. **Configuration** : Suivez les étapes de [configuration](guides/deployment.md)
3. **API** : Explorez l'[API](api/endpoints.md) avec la [documentation interactive](http://localhost:8000/api/docs/)
4. **Exemples** : Consultez les [exemples pratiques](api/examples.md)

## 📊 Vue d'ensemble du Projet

L'application de tourisme Django est une solution complète et moderne pour la gestion de ressources touristiques avec :

**Fonctionnalités Core** :
- ✅ **Import JSON-LD** - Support natif du format DataTourisme
- ✅ **API REST multilingue** - Support de 6 langues
- ✅ **Recherche géospatiale** - PostGIS pour la localisation
- ✅ **Interface d'administration** - Django Admin personnalisé

**Fonctionnalités Avancées** :
- ✅ **Cache Redis intelligent** - Performance optimisée avec cache distribué
- ✅ **Moteur de recherche Elasticsearch** - Recherche avancée multilingue et géographique
- ✅ **API GraphQL flexible** - Récupération de données sur mesure
- ✅ **Communication temps réel** - WebSockets pour notifications instantanées
- ✅ **Traitement asynchrone** - Celery pour tâches background et exports
- ✅ **Analytics avancées** - Monitoring et métriques en temps réel

**Infrastructure** :
- ✅ **Architecture distribuée** - Services spécialisés pour scalabilité
- ✅ **Déploiement Docker** - Containerisation complète multi-services
- ✅ **Documentation OpenAPI** - Swagger/OpenAPI intégré

## 🔗 Liens Utiles

- [Code Source](../README.md)
- [API REST Documentation](http://localhost:8000/api/docs/) (Swagger)
- [API GraphQL](http://localhost:8000/graphql/) (GraphiQL)
- [Interface Admin](http://localhost:8000/admin/)
- [Monitoring Celery](http://localhost:5555/) (Flower)
- [Endpoints API](http://localhost:8000/api/v1/)

## 🤝 Contribution

Pour contribuer à cette documentation, consultez le [guide de contribution](development/contributing.md).