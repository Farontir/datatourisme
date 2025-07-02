"""
Commande Django pour exécuter des tâches Celery manuellement
"""
from django.core.management.base import BaseCommand
from celery import current_app
import json


class Command(BaseCommand):
    help = 'Exécute une tâche Celery manuellement'

    def add_arguments(self, parser):
        parser.add_argument(
            'task_name',
            type=str,
            help='Nom de la tâche à exécuter (ex: tourism.tasks.update_cache_statistics)',
        )
        parser.add_argument(
            '--args',
            type=str,
            help='Arguments positionnels en JSON (ex: \'["arg1", "arg2"]\')',
        )
        parser.add_argument(
            '--kwargs',
            type=str,
            help='Arguments nommés en JSON (ex: \'{"key": "value"}\')',
        )
        parser.add_argument(
            '--async',
            action='store_true',
            help='Exécuter de manière asynchrone (par défaut: synchrone)',
        )

    def handle(self, *args, **options):
        task_name = options['task_name']
        task_args = options.get('args')
        task_kwargs = options.get('kwargs')
        is_async = options.get('async', False)
        
        self.stdout.write(
            self.style.SUCCESS(f'=== Exécution de la tâche: {task_name} ===\n')
        )
        
        try:
            # Parser les arguments
            parsed_args = []
            parsed_kwargs = {}
            
            if task_args:
                try:
                    parsed_args = json.loads(task_args)
                    if not isinstance(parsed_args, list):
                        raise ValueError("Les args doivent être une liste JSON")
                except json.JSONDecodeError as e:
                    self.stdout.write(
                        self.style.ERROR(f'Erreur parsing args: {e}')
                    )
                    return
            
            if task_kwargs:
                try:
                    parsed_kwargs = json.loads(task_kwargs)
                    if not isinstance(parsed_kwargs, dict):
                        raise ValueError("Les kwargs doivent être un objet JSON")
                except json.JSONDecodeError as e:
                    self.stdout.write(
                        self.style.ERROR(f'Erreur parsing kwargs: {e}')
                    )
                    return
            
            # Récupérer la tâche
            try:
                task = current_app.tasks[task_name]
            except KeyError:
                self.stdout.write(
                    self.style.ERROR(f'Tâche non trouvée: {task_name}')
                )
                self._list_available_tasks()
                return
            
            # Afficher les paramètres
            self.stdout.write(f'Tâche: {task_name}')
            if parsed_args:
                self.stdout.write(f'Arguments: {parsed_args}')
            if parsed_kwargs:
                self.stdout.write(f'Arguments nommés: {parsed_kwargs}')
            self.stdout.write(f'Mode: {"Asynchrone" if is_async else "Synchrone"}')
            self.stdout.write('')
            
            # Exécuter la tâche
            if is_async:
                self._run_async(task, parsed_args, parsed_kwargs)
            else:
                self._run_sync(task, parsed_args, parsed_kwargs)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de l\'exécution: {e}')
            )

    def _run_sync(self, task, args, kwargs):
        """Exécute la tâche de manière synchrone"""
        
        self.stdout.write('Exécution synchrone...')
        
        try:
            result = task.apply(args=args, kwargs=kwargs)
            
            self.stdout.write(
                self.style.SUCCESS('✓ Tâche exécutée avec succès')
            )
            
            # Afficher le résultat
            if result.successful():
                self.stdout.write(f'Résultat: {result.result}')
            else:
                self.stdout.write(
                    self.style.ERROR(f'Erreur d\'exécution: {result.result}')
                )
                if result.traceback:
                    self.stdout.write(f'Traceback: {result.traceback}')
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur exécution synchrone: {e}')
            )

    def _run_async(self, task, args, kwargs):
        """Exécute la tâche de manière asynchrone"""
        
        self.stdout.write('Exécution asynchrone...')
        
        try:
            result = task.delay(*args, **kwargs)
            
            self.stdout.write(
                self.style.SUCCESS('✓ Tâche envoyée au worker')
            )
            self.stdout.write(f'Task ID: {result.id}')
            self.stdout.write('Utilisez "celery_status" pour vérifier le statut')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur exécution asynchrone: {e}')
            )

    def _list_available_tasks(self):
        """Liste les tâches disponibles"""
        
        self.stdout.write('\nTâches disponibles:')
        
        try:
            # Filtrer les tâches de l'application tourism
            tourism_tasks = []
            all_tasks = []
            
            for task_name in current_app.tasks.keys():
                all_tasks.append(task_name)
                if 'tourism' in task_name:
                    tourism_tasks.append(task_name)
            
            if tourism_tasks:
                self.stdout.write('\nTâches Tourism:')
                for task in sorted(tourism_tasks):
                    self.stdout.write(f'  - {task}')
            
            # Afficher quelques autres tâches importantes
            system_tasks = [task for task in all_tasks if not task.startswith('celery.') and 'tourism' not in task]
            if system_tasks:
                self.stdout.write('\nAutres tâches disponibles:')
                for task in sorted(system_tasks)[:10]:  # Limiter à 10
                    self.stdout.write(f'  - {task}')
                
                if len(system_tasks) > 10:
                    self.stdout.write(f'  ... et {len(system_tasks) - 10} autres')
            
        except Exception as e:
            self.stdout.write(f'Erreur récupération tâches: {e}')