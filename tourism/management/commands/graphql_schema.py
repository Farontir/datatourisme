"""
Commande Django pour générer le schéma GraphQL
"""
from django.core.management.base import BaseCommand
import json


class Command(BaseCommand):
    help = 'Génère le schéma GraphQL en format JSON ou SDL'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            choices=['json', 'sdl'],
            default='json',
            help='Format de sortie (json ou sdl)',
        )
        parser.add_argument(
            '--output',
            type=str,
            help='Fichier de sortie (optionnel)',
        )

    def handle(self, *args, **options):
        output_format = options.get('format', 'json')
        output_file = options.get('output')
        
        self.stdout.write(
            self.style.SUCCESS('=== Génération du schéma GraphQL ===\n')
        )
        
        try:
            from tourism.schema import schema
            
            if output_format == 'json':
                self._generate_json_schema(schema, output_file)
            else:
                self._generate_sdl_schema(schema, output_file)
            
            self.stdout.write(
                self.style.SUCCESS('\n✓ Schéma généré avec succès')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la génération: {e}')
            )

    def _generate_json_schema(self, schema, output_file=None):
        """Génère le schéma en format JSON (introspection)"""
        
        from graphql import get_introspection_query, build_client_schema, get_schema_from_ast
        from graphql.execution import execute
        
        self.stdout.write('Génération du schéma JSON (introspection)...')
        
        # Exécuter la requête d'introspection
        introspection_query = get_introspection_query()
        result = execute(schema, introspection_query)
        
        if result.errors:
            raise Exception(f"Erreurs d'introspection: {result.errors}")
        
        # Formater le résultat
        schema_json = json.dumps(result.data, indent=2, ensure_ascii=False)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(schema_json)
            self.stdout.write(f'  → Schéma sauvegardé dans {output_file}')
        else:
            self.stdout.write('  → Schéma JSON:')
            # Afficher un extrait du schéma
            lines = schema_json.split('\n')
            for line in lines[:20]:
                self.stdout.write(f'    {line}')
            if len(lines) > 20:
                self.stdout.write(f'    ... ({len(lines) - 20} lignes supplémentaires)')

    def _generate_sdl_schema(self, schema, output_file=None):
        """Génère le schéma en format SDL (Schema Definition Language)"""
        
        from graphql import print_schema
        
        self.stdout.write('Génération du schéma SDL...')
        
        # Convertir en SDL
        sdl_schema = print_schema(schema)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(sdl_schema)
            self.stdout.write(f'  → Schéma sauvegardé dans {output_file}')
        else:
            self.stdout.write('  → Schéma SDL:')
            # Afficher un extrait du schéma
            lines = sdl_schema.split('\n')
            for line in lines[:30]:
                self.stdout.write(f'    {line}')
            if len(lines) > 30:
                self.stdout.write(f'    ... ({len(lines) - 30} lignes supplémentaires)')
    
    def _show_schema_info(self, schema):
        """Affiche des informations sur le schéma"""
        
        # Compter les types
        type_map = schema.type_map
        
        # Filtrer les types internes GraphQL
        custom_types = {
            name: type_def for name, type_def in type_map.items()
            if not name.startswith('__')
        }
        
        # Compter par catégorie
        object_types = 0
        input_types = 0
        enum_types = 0
        scalar_types = 0
        
        for type_def in custom_types.values():
            from graphql import GraphQLObjectType, GraphQLInputObjectType, GraphQLEnumType, GraphQLScalarType
            
            if isinstance(type_def, GraphQLObjectType):
                object_types += 1
            elif isinstance(type_def, GraphQLInputObjectType):
                input_types += 1
            elif isinstance(type_def, GraphQLEnumType):
                enum_types += 1
            elif isinstance(type_def, GraphQLScalarType):
                scalar_types += 1
        
        self.stdout.write('\nInformations sur le schéma:')
        self.stdout.write(f"  Types d'objets: {object_types}")
        self.stdout.write(f"  Types d'entrée: {input_types}")
        self.stdout.write(f"  Types énumération: {enum_types}")
        self.stdout.write(f"  Types scalaires: {scalar_types}")
        self.stdout.write(f"  Total types: {len(custom_types)}")
        
        # Lister les requêtes principales
        query_type = schema.query_type
        if query_type:
            query_fields = list(query_type.fields.keys())
            self.stdout.write(f"\nRequêtes disponibles ({len(query_fields)}):")
            for field_name in sorted(query_fields):
                self.stdout.write(f"  - {field_name}")
        
        # Lister les mutations si disponibles
        mutation_type = schema.mutation_type
        if mutation_type:
            mutation_fields = list(mutation_type.fields.keys())
            self.stdout.write(f"\nMutations disponibles ({len(mutation_fields)}):")
            for field_name in sorted(mutation_fields):
                self.stdout.write(f"  - {field_name}")