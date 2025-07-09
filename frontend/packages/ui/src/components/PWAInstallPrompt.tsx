import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Alert, AlertDescription } from './Alert';
import { 
  Download,
  X,
  Smartphone,
  Monitor,
  Share,
  Home,
  Bell,
  Wifi,
  Star
} from 'lucide-react';

// Types
export interface PWAInstallPromptProps {
  appName?: string;
  appDescription?: string;
  features?: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  onInstall?: () => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  showDelay?: number;
  className?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// PWA Install Prompt Component
export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  appName = 'DataTourisme',
  appDescription = 'Découvrez et réservez vos expériences touristiques en France',
  features = [
    {
      icon: <Wifi className="w-5 h-5" />,
      title: 'Mode hors ligne',
      description: 'Accédez à vos favoris même sans connexion'
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: 'Notifications push',
      description: 'Recevez des rappels pour vos réservations'
    },
    {
      icon: <Home className="w-5 h-5" />,
      title: 'Accès rapide',
      description: 'Ajoutez l\'app à votre écran d\'accueil'
    }
  ],
  onInstall,
  onDismiss,
  autoShow = true,
  showDelay = 3000,
  className
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installationSupported, setInstallationSupported] = useState(false);

  // Check if PWA is already installed
  const checkIfInstalled = useCallback(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true ||
                        document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);
    return isStandalone;
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setInstallationSupported(true);

      if (autoShow && !checkIfInstalled()) {
        setTimeout(() => {
          setShowPrompt(true);
        }, showDelay);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check initial state
    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, showDelay, checkIfInstalled]);

  // Handle install button click
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        onInstall?.();
      }
      
      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowPrompt(false);
      
    } catch (error) {
      console.error('Error during PWA installation:', error);
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, onInstall]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    onDismiss?.();
  }, [onDismiss]);

  // Manual install instructions for different platforms
  const getManualInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        platform: 'iOS',
        icon: <Share className="w-4 h-4" />,
        steps: [
          'Appuyez sur le bouton Partager',
          'Sélectionnez "Sur l\'écran d\'accueil"',
          'Appuyez sur "Ajouter"'
        ]
      };
    } else if (userAgent.includes('android')) {
      return {
        platform: 'Android',
        icon: <Monitor className="w-4 h-4" />,
        steps: [
          'Appuyez sur le menu du navigateur (⋮)',
          'Sélectionnez "Ajouter à l\'écran d\'accueil"',
          'Appuyez sur "Ajouter"'
        ]
      };
    } else {
      return {
        platform: 'Desktop',
        icon: <Download className="w-4 h-4" />,
        steps: [
          'Cliquez sur l\'icône d\'installation dans la barre d\'adresse',
          'Ou utilisez le menu du navigateur',
          'Sélectionnez "Installer l\'application"'
        ]
      };
    }
  };

  // Don't show if already installed or not supported
  if (isInstalled || (!installationSupported && !showPrompt)) {
    return null;
  }

  const instructions = getManualInstructions();

  return (
    <div className={cn('fixed inset-0 z-50 flex items-end sm:items-center justify-center', className)}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleDismiss} />
      
      {/* Prompt Card */}
      <Card className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Installer {appName}</CardTitle>
              <p className="text-sm text-neutral-600">{appDescription}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Features */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Avantages de l'application :</h4>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.title}</p>
                    <p className="text-xs text-neutral-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Install Button or Manual Instructions */}
          {deferredPrompt ? (
            <div className="space-y-3">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full"
                size="lg"
              >
                {isInstalling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Installation...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Installer l'application
                  </>
                )}
              </Button>
              <p className="text-xs text-neutral-500 text-center">
                L'installation est gratuite et ne prend que quelques secondes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Alert>
                {instructions.icon}
                <AlertDescription>
                  <p className="font-medium mb-2">Installation manuelle sur {instructions.platform} :</p>
                  <ol className="text-sm space-y-1">
                    {instructions.steps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium mr-2 mt-0.5">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleDismiss} className="flex-1">
              Plus tard
            </Button>
            {!deferredPrompt && (
              <Button onClick={handleDismiss} className="flex-1">
                Compris
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// PWA Status Component
export interface PWAStatusProps {
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className }) => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if PWA is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    // Online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    checkInstalled();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isInstalled) return null;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        isOnline ? 'bg-green-500' : 'bg-red-500'
      )} />
      <span className="text-xs text-neutral-600">
        {isOnline ? 'En ligne' : 'Hors ligne'}
      </span>
    </div>
  );
};

// Hook for PWA features
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const checkInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
      setIsInstalled(installed);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    checkInstalled();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstalled,
    isInstallable,
    install
  };
}

PWAInstallPrompt.displayName = 'PWAInstallPrompt';
PWAStatus.displayName = 'PWAStatus';