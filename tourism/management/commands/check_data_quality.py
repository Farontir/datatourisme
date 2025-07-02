from django.core.management.base import BaseCommand
from tourism.models import TouristicResource

class Command(BaseCommand):
    help = 'Vérifie la qualité des données'
    
    def handle(self, *args, **options):
        resources = TouristicResource.objects.all()
        total = resources.count()
        
        issues = {
            'missing_location': 0,
            'missing_description': 0,
            'missing_opening_hours': 0,
            'missing_prices': 0,
            'missing_media': 0,
        }
        
        for resource in resources:
            if not resource.location:
                issues['missing_location'] += 1
            
            if not resource.description or all(not v for v in resource.description.values()):
                issues['missing_description'] += 1
            
            if not resource.opening_hours.exists():
                issues['missing_opening_hours'] += 1
            
            if not resource.prices.exists():
                issues['missing_prices'] += 1
            
            if not resource.media.exists():
                issues['missing_media'] += 1
        
        self.stdout.write(f"\nRapport qualité des données ({total} ressources):")
        self.stdout.write("-" * 50)
        
        for issue, count in issues.items():
            percentage = (count / total * 100) if total > 0 else 0
            status = self.style.SUCCESS('OK') if percentage < 10 else self.style.WARNING('WARNING')
            if percentage > 50:
                status = self.style.ERROR('CRITICAL')
            
            self.stdout.write(
                f"{issue.replace('_', ' ').title()}: {count} ({percentage:.1f}%) {status}"
            )