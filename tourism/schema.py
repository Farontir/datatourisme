"""
Schéma GraphQL principal pour l'application tourism
"""
import graphene
from .graphql_types import Query


# Schéma principal
schema = graphene.Schema(query=Query)