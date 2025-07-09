import React, { useState, useCallback, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { UseFormReturn } from 'react-hook-form';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Progress } from './Progress';

// Wizard Context
interface WizardContextType {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrev: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  isStepCompleted: (step: number) => boolean;
  isStepValid: (step: number) => boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a FormWizard');
  }
  return context;
};

// Step Configuration
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  validate?: () => boolean | Promise<boolean>;
  onEnter?: () => void | Promise<void>;
  onLeave?: () => void | Promise<void>;
}

// Wizard Props
interface FormWizardProps {
  steps: WizardStep[];
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
  form?: UseFormReturn<any>;
  className?: string;
  children: React.ReactNode;
  // Navigation options
  showProgress?: boolean;
  showStepNumbers?: boolean;
  allowStepNavigation?: boolean;
  validateOnStepChange?: boolean;
  // Auto-save options
  autoSave?: boolean;
  autoSaveDelay?: number;
  onAutoSave?: (data: any) => void;
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  form,
  className,
  children,
  showProgress = true,
  showStepNumbers = true,
  allowStepNavigation = false,
  validateOnStepChange = true,
  autoSave = false,
  autoSaveDelay = 2000,
  onAutoSave,
}) => {
  const [internalStep, setInternalStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [validSteps, setValidSteps] = useState<Set<number>>(new Set());
  
  const currentStep = controlledStep ?? internalStep;
  const totalSteps = steps.length;

  const isStepCompleted = useCallback((step: number) => {
    return completedSteps.has(step);
  }, [completedSteps]);

  const isStepValid = useCallback((step: number) => {
    return validSteps.has(step);
  }, [validSteps]);

  const validateStep = useCallback(async (step: number): Promise<boolean> => {
    const stepConfig = steps[step];
    
    // Check form validation if form is provided
    if (form && validateOnStepChange) {
      const isFormValid = await form.trigger();
      if (!isFormValid) return false;
    }

    // Check custom step validation
    if (stepConfig.validate) {
      try {
        const isValid = await stepConfig.validate();
        return isValid;
      } catch (error) {
        console.error(`Step ${step} validation failed:`, error);
        return false;
      }
    }

    return true;
  }, [form, steps, validateOnStepChange]);

  const goToStep = useCallback(async (step: number) => {
    if (step < 0 || step >= totalSteps) return;
    if (!allowStepNavigation && step !== currentStep + 1 && step !== currentStep - 1) return;

    // Validate current step before leaving
    if (validateOnStepChange) {
      const isCurrentStepValid = await validateStep(currentStep);
      if (!isCurrentStepValid) return;
      
      setValidSteps(prev => new Set([...prev, currentStep]));
    }

    // Call onLeave for current step
    const currentStepConfig = steps[currentStep];
    if (currentStepConfig.onLeave) {
      try {
        await currentStepConfig.onLeave();
      } catch (error) {
        console.error(`Failed to leave step ${currentStep}:`, error);
        return;
      }
    }

    // Mark previous step as completed
    if (step > currentStep) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
    }

    // Call onEnter for new step
    const newStepConfig = steps[step];
    if (newStepConfig.onEnter) {
      try {
        await newStepConfig.onEnter();
      } catch (error) {
        console.error(`Failed to enter step ${step}:`, error);
        return;
      }
    }

    // Update step
    if (controlledStep === undefined) {
      setInternalStep(step);
    }
    onStepChange?.(step);
  }, [
    currentStep,
    totalSteps,
    allowStepNavigation,
    validateOnStepChange,
    validateStep,
    steps,
    controlledStep,
    onStepChange,
  ]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      // Last step - complete wizard
      onComplete?.();
    }
  }, [currentStep, totalSteps, goToStep, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  const canGoNext = currentStep < totalSteps - 1 || (currentStep === totalSteps - 1);
  const canGoPrev = currentStep > 0;

  const wizardValue: WizardContextType = {
    currentStep,
    totalSteps,
    canGoNext,
    canGoPrev,
    goToStep,
    nextStep,
    prevStep,
    isStepCompleted,
    isStepValid,
  };

  return (
    <WizardContext.Provider value={wizardValue}>
      <div className={cn('space-y-6', className)}>
        {/* Progress Indicator */}
        {showProgress && (
          <div className="space-y-2">
            <Progress
              value={(currentStep / (totalSteps - 1)) * 100}
              className="h-2"
            />
            <div className="flex justify-between text-sm text-neutral-600">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round((currentStep / (totalSteps - 1)) * 100)}% Complete</span>
            </div>
          </div>
        )}

        {/* Step Navigation */}
        {showStepNumbers && (
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <WizardStepIndicator
                  step={index}
                  title={step.title}
                  active={index === currentStep}
                  completed={isStepCompleted(index)}
                  valid={isStepValid(index)}
                  optional={step.optional}
                  clickable={allowStepNavigation}
                  onClick={() => allowStepNavigation && goToStep(index)}
                />
                {index < steps.length - 1 && (
                  <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-800" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {children}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={!canGoPrev}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span>{steps[currentStep].title}</span>
            {steps[currentStep].optional && (
              <span className="text-xs text-neutral-500">(Optional)</span>
            )}
          </div>

          <Button
            type="button"
            onClick={nextStep}
            disabled={!canGoNext}
            className="flex items-center gap-2"
          >
            {currentStep === totalSteps - 1 ? 'Complete' : 'Next'}
            {currentStep === totalSteps - 1 ? (
              <Check className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </WizardContext.Provider>
  );
};

// Step Indicator Component
interface WizardStepIndicatorProps {
  step: number;
  title: string;
  active: boolean;
  completed: boolean;
  valid: boolean;
  optional?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

const stepIndicatorVariants = cva(
  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
  {
    variants: {
      state: {
        pending: 'border-neutral-300 bg-white text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
        active: 'border-primary-600 bg-primary-600 text-white',
        completed: 'border-success-600 bg-success-600 text-white',
        invalid: 'border-error-600 bg-error-50 text-error-600 dark:bg-error-900',
      },
      clickable: {
        true: 'cursor-pointer hover:border-primary-500',
        false: 'cursor-default',
      },
    },
    defaultVariants: {
      state: 'pending',
      clickable: false,
    },
  }
);

const WizardStepIndicator: React.FC<WizardStepIndicatorProps> = ({
  step,
  title,
  active,
  completed,
  valid,
  optional,
  clickable,
  onClick,
}) => {
  const getState = () => {
    if (completed) return 'completed';
    if (active) return 'active';
    if (!valid && step > 0) return 'invalid';
    return 'pending';
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={cn(
          stepIndicatorVariants({
            state: getState(),
            clickable: clickable || false,
          })
        )}
        onClick={clickable ? onClick : undefined}
        title={title}
      >
        {completed ? (
          <Check className="h-4 w-4" />
        ) : (
          <span>{step + 1}</span>
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-medium">{title}</div>
        {optional && (
          <div className="text-xs text-neutral-500">Optional</div>
        )}
      </div>
    </div>
  );
};

// Step Content Component
interface WizardStepProps {
  step: number;
  children: React.ReactNode;
  className?: string;
}

export const WizardStep: React.FC<WizardStepProps> = ({
  step,
  children,
  className,
}) => {
  const { currentStep } = useWizard();

  if (currentStep !== step) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
};

// Export all components
export { WizardStepIndicator };