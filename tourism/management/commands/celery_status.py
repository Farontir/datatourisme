"""
Commande Django pour vérifier le statut de Celery
"""
from django.core.management.base import BaseCommand
from celery import current_app
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Affiche le statut des workers et des tâches Celery'

    def add_arguments(self, parser):
        parser.add_argument(
            '--detailed',
            action='store_true',
            help='Afficher des informations détaillées',
        )

    def handle(self, *args, **options):
        detailed = options.get('detailed', False)
        
        self.stdout.write(
            self.style.SUCCESS('=== Statut Celery ===\n')
        )
        
        try:
            # Vérifier la connexion au broker
            self._check_broker_connection()
            
            # Afficher les workers actifs
            self._show_active_workers(detailed)
            
            # Afficher les tâches en cours
            self._show_active_tasks()
            
            # Afficher les tâches périodiques
            self._show_scheduled_tasks()
            
            # Statistiques détaillées si demandées
            if detailed:
                self._show_detailed_stats()
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erreur lors de la vérification: {e}')
            )

    def _check_broker_connection(self):
        """Vérifie la connexion au broker Redis"""
        
        self.stdout.write('Vérification de la connexion au broker...')
        
        try:
            # Tester la connexion via l'inspection Celery
            inspect = current_app.control.inspect()
            stats = inspect.stats()
            
            if stats:
                self.stdout.write('  ✓ Connexion au broker réussie')
                return True
            else:
                self.stdout.write('  ✗ Aucun worker détecté')
                return False
                
        except Exception as e:
            self.stdout.write(f'  ✗ Erreur de connexion: {e}')
            return False

    def _show_active_workers(self, detailed=False):
        """Affiche les workers actifs"""
        
        self.stdout.write('\nWorkers actifs:')
        
        try:
            inspect = current_app.control.inspect()
            stats = inspect.stats()
            
            if not stats:
                self.stdout.write('  Aucun worker actif')
                return
            
            for worker_name, worker_stats in stats.items():
                self.stdout.write(f'  → {worker_name}')
                
                if detailed:
                    # Informations détaillées sur le worker
                    self.stdout.write(f'    Pool: {worker_stats.get("pool", {}).get("implementation", "N/A")}')
                    self.stdout.write(f'    Processus: {worker_stats.get("pool", {}).get("max-concurrency", "N/A")}')
                    self.stdout.write(f'    Tâches totales: {worker_stats.get("total", "N/A")}')
                    
                    # Charge du worker
                    load_avg = worker_stats.get("rusage", {}).get("utime", 0)
                    self.stdout.write(f'    Charge CPU: {load_avg:.2f}s')
                
        except Exception as e:
            self.stdout.write(f'  Erreur récupération workers: {e}')

    def _show_active_tasks(self):
        """Affiche les tâches en cours d'exécution"""
        
        self.stdout.write('\nTâches en cours:')
        
        try:
            inspect = current_app.control.inspect()
            active_tasks = inspect.active()
            
            if not active_tasks:
                self.stdout.write('  Aucune tâche en cours')
                return
            
            total_tasks = 0
            for worker_name, tasks in active_tasks.items():
                if tasks:
                    self.stdout.write(f'  Worker: {worker_name}')
                    
                    for task in tasks:
                        task_name = task.get('name', 'Unknown')
                        task_id = task.get('id', 'Unknown')
                        
                        # Calculer le temps d'exécution
                        time_start = task.get('time_start')
                        if time_start:
                            start_time = datetime.fromtimestamp(time_start)
                            duration = datetime.now() - start_time
                            duration_str = f"({duration.total_seconds():.1f}s)"
                        else:
                            duration_str = ""
                        
                        self.stdout.write(f'    - {task_name} [{task_id}] {duration_str}')
                        total_tasks += 1
            
            if total_tasks == 0:
                self.stdout.write('  Aucune tâche en cours')
            else:
                self.stdout.write(f'\n  Total: {total_tasks} tâche(s) en cours')
                
        except Exception as e:
            self.stdout.write(f'  Erreur récupération tâches: {e}')

    def _show_scheduled_tasks(self):
        """Affiche les tâches périodiques (beat)"""
        
        self.stdout.write('\nTâches périodiques configurées:')
        
        try:
            # Récupérer la configuration beat
            beat_schedule = current_app.conf.beat_schedule
            
            if not beat_schedule:
                self.stdout.write('  Aucune tâche périodique configurée')
                return
            
            for task_name, task_config in beat_schedule.items():
                self.stdout.write(f'  → {task_name}')
                self.stdout.write(f'    Tâche: {task_config["task"]}')
                
                # Afficher la planification
                schedule = task_config.get('schedule')
                if hasattr(schedule, '__str__'):
                    schedule_str = str(schedule)
                else:
                    schedule_str = f'{schedule} secondes'
                
                self.stdout.write(f'    Planification: {schedule_str}')
                
        except Exception as e:
            self.stdout.write(f'  Erreur récupération tâches périodiques: {e}')

    def _show_detailed_stats(self):
        """Affiche des statistiques détaillées"""
        
        self.stdout.write('\nStatistiques détaillées:')
        
        try:
            inspect = current_app.control.inspect()
            
            # Tâches enregistrées
            registered_tasks = inspect.registered()
            if registered_tasks:
                task_count = sum(len(tasks) for tasks in registered_tasks.values())
                self.stdout.write(f'  Tâches enregistrées: {task_count}')
                
                # Lister quelques tâches principales
                for worker_name, tasks in registered_tasks.items():
                    tourism_tasks = [task for task in tasks if 'tourism' in task]
                    if tourism_tasks:
                        self.stdout.write(f'  Tâches tourism sur {worker_name}: {len(tourism_tasks)}')
            
            # File d'attente
            reserved_tasks = inspect.reserved()
            if reserved_tasks:
                reserved_count = sum(len(tasks) for tasks in reserved_tasks.values())
                if reserved_count > 0:
                    self.stdout.write(f'  Tâches en file d\'attente: {reserved_count}')
            
        except Exception as e:
            self.stdout.write(f'  Erreur récupération stats détaillées: {e}')