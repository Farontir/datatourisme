import React, { useState, useEffect, useCallback } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Progress } from './Progress';
import { Badge } from './Badge';
import { Alert, AlertDescription } from './Alert';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Users,
  CreditCard,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle
} from 'lucide-react';

// Types
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  isValid: boolean;
  isOptional?: boolean;
  component: React.ComponentType<any>;
}

export interface BookingWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  showProgress?: boolean;
  allowSkipOptional?: boolean;
  className?: string;
}

// Wizard variants
const wizardVariants = cva(
  'w-full max-w-4xl mx-auto',
  {
    variants: {
      variant: {
        default: 'space-y-6',
        compact: 'space-y-4',
        minimal: 'space-y-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Step indicator component
interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  variant?: 'horizontal' | 'vertical';
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
  variant = 'horizontal'
}) => {
  if (variant === 'vertical') {
    return (
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          const isClickable = onStepClick && (isCompleted || isActive);

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                isClickable && 'cursor-pointer hover:bg-neutral-50',
                isActive && 'bg-primary-50 border border-primary-200',
                isCompleted && 'bg-green-50 border border-green-200'
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                isCompleted && 'bg-green-500 text-white',
                isActive && 'bg-primary-500 text-white',
                !isActive && !isCompleted && 'bg-neutral-200 text-neutral-600'
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <div className="flex-1">
                <p className={cn(
                  'text-sm font-medium',
                  isActive && 'text-primary-700',
                  isCompleted && 'text-green-700',
                  !isActive && !isCompleted && 'text-neutral-600'
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-neutral-500">{step.description}</p>
                )}
              </div>
              {step.isOptional && (
                <Badge variant="secondary" className="text-xs">Optionnel</Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = onStepClick && (isCompleted || isActive);

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex flex-col items-center space-y-2',
                isClickable && 'cursor-pointer'
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors',
                isCompleted && 'bg-green-500 text-white',
                isActive && 'bg-primary-500 text-white',
                !isActive && !isCompleted && 'bg-neutral-200 text-neutral-600'
              )}>
                {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              <div className="text-center">
                <p className={cn(
                  'text-sm font-medium',
                  isActive && 'text-primary-700',
                  isCompleted && 'text-green-700',
                  !isActive && !isCompleted && 'text-neutral-600'
                )}>
                  {step.title}
                </p>
                {step.isOptional && (
                  <Badge variant="secondary" className="text-xs mt-1">Optionnel</Badge>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-4',
                index < currentStep ? 'bg-green-500' : 'bg-neutral-200'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// Auto-save status component
interface AutoSaveStatusProps {
  lastSaved?: Date;
  isSaving: boolean;
  hasError: boolean;
}

const AutoSaveStatus: React.FC<AutoSaveStatusProps> = ({
  lastSaved,
  isSaving,
  hasError
}) => {
  if (isSaving) {
    return (
      <div className="flex items-center space-x-2 text-sm text-neutral-600">
        <Clock className="w-4 h-4 animate-spin" />
        <span>Sauvegarde en cours...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span>Erreur de sauvegarde</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center space-x-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>Sauvegardé à {lastSaved.toLocaleTimeString('fr-FR')}</span>
      </div>
    );
  }

  return null;
};

// Main BookingWizard component
export const BookingWizard: React.FC<BookingWizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  onCancel,
  isLoading = false,
  autoSave = true,
  autoSaveInterval = 30000,
  showProgress = true,
  allowSkipOptional = true,
  className,
  ...props
}) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Auto-save logic
  const performAutoSave = useCallback(async () => {
    if (!autoSave) return;

    setIsSaving(true);
    setSaveError(false);

    try {
      // Simulate auto-save API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSaved(new Date());
    } catch (error) {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [autoSave]);

  // Auto-save interval
  useEffect(() => {
    if (!autoSave) return;

    const interval = setInterval(performAutoSave, autoSaveInterval);
    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, performAutoSave]);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const canGoNext = currentStepData?.isValid || (currentStepData?.isOptional && allowSkipOptional);
  const canGoPrevious = !isFirstStep;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else if (canGoNext) {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      onStepChange(currentStep - 1);
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn(wizardVariants({ variant: 'default' }), className)} {...props}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round(progressPercentage)}% terminé
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator
        steps={steps}
        currentStep={currentStep}
        onStepClick={onStepChange}
      />

      {/* Auto-save Status */}
      {autoSave && (
        <div className="flex justify-end">
          <AutoSaveStatus
            lastSaved={lastSaved || undefined}
            isSaving={isSaving}
            hasError={saveError}
          />
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <span className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium bg-primary-500 text-white'
            )}>
              {currentStepData?.icon}
            </span>
            <span>{currentStepData?.title}</span>
          </CardTitle>
          {currentStepData?.description && (
            <p className="text-neutral-600">{currentStepData.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {/* Render current step component */}
          {currentStepData && (
            <currentStepData.component
              onValidationChange={(isValid: boolean) => {
                // Update step validation
                const updatedSteps = [...steps];
                updatedSteps[currentStep].isValid = isValid;
              }}
            />
          )}

          {/* Step validation warning */}
          {!currentStepData?.isValid && !currentStepData?.isOptional && (
            <Alert variant="warning" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez compléter tous les champs requis avant de continuer.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={!canGoPrevious || isLoading}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Précédent
          </Button>
        </div>

        <div className="flex space-x-2">
          {currentStepData?.isOptional && allowSkipOptional && !currentStepData.isValid && (
            <Button variant="ghost" onClick={handleNext} disabled={isLoading}>
              Ignorer cette étape
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canGoNext || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <Clock className="w-4 h-4 animate-spin mr-2" />
            ) : isLastStep ? (
              <CheckCircle className="w-4 h-4 mr-2" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-2" />
            )}
            {isLastStep ? 'Finaliser' : 'Suivant'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Preset step icons
export const StepIcons = {
  Selection: <Calendar className="w-5 h-5" />,
  Details: <Users className="w-5 h-5" />,
  Payment: <CreditCard className="w-5 h-5" />,
  Confirmation: <CheckCircle className="w-5 h-5" />,
  Location: <MapPin className="w-5 h-5" />,
};

BookingWizard.displayName = 'BookingWizard';

export { StepIndicator, AutoSaveStatus };