from django.core.management.base import BaseCommand
from core.utils import generate_secret_key

class Command(BaseCommand):
    help = 'Génère une nouvelle clé secrète Django'
    
    def handle(self, *args, **options):
        secret_key = generate_secret_key()
        self.stdout.write(
            self.style.SUCCESS(f'Nouvelle clé secrète générée:')
        )
        self.stdout.write(secret_key)
        self.stdout.write(
            self.style.WARNING('\nCopiez cette clé dans votre fichier .env')
        )