import React, { createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useFormContext, Controller, FormProvider } from 'react-hook-form';
import { cn } from '../utils/cn';

// Form Context
interface FormContextType {
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const FormContext = createContext<FormContextType>({});

export const useFormFieldContext = () => {
  const context = useContext(FormContext);
  return context;
};

// Form Root Component
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, disabled, size = 'default', children, ...props }, ref) => {
    return (
      <FormContext.Provider value={{ disabled, size }}>
        <form
          ref={ref}
          className={cn('space-y-6', className)}
          {...props}
        >
          {children}
        </form>
      </FormContext.Provider>
    );
  }
);
Form.displayName = 'Form';

// Form Field Container
interface FormFieldProps {
  name: string;
  children?: React.ReactNode;
  className?: string;
  render?: ({ field, fieldState }: { field: any; fieldState: any }) => React.ReactNode;
}

const FormField = ({ name, children, className, render }: FormFieldProps) => {
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldContext.Provider value={{ name, field, fieldState }}>
          <div className={cn('space-y-2', className)}>
            {render ? render({ field, fieldState }) : children}
          </div>
        </FormFieldContext.Provider>
      )}
    />
  );
};

// Form Field Context
interface FormFieldContextType {
  name: string;
  field: any;
  fieldState: any;
}

const FormFieldContext = createContext<FormFieldContextType | null>(null);

export const useFormField = () => {
  const context = useContext(FormFieldContext);
  const formContext = useFormContext();
  
  if (!context) {
    throw new Error('useFormField must be used within a FormField');
  }

  const { name, field, fieldState } = context;
  const { error } = fieldState;

  return {
    id: name,
    name,
    formItemId: `${name}-form-item`,
    formDescriptionId: `${name}-form-item-description`,
    formMessageId: `${name}-form-item-message`,
    field,
    error,
    ...field,
  };
};

// Form Item
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  );
});
FormItem.displayName = 'FormItem';

// Form Label
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error && 'text-error-600',
        className
      )}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

// Form Control (wrapper for input components)
const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <div
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';

// Form Description
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

// Form Message (for errors)
const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-sm font-medium text-error-600', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

// Advanced Input Component with validation
const inputVariants = cva(
  'flex w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400',
  {
    variants: {
      variant: {
        default: 'focus-visible:ring-primary-500',
        success: 'border-success-500 focus-visible:ring-success-500',
        error: 'border-error-500 focus-visible:ring-error-500',
        warning: 'border-warning-500 focus-visible:ring-warning-500',
      },
      size: {
        sm: 'h-8 text-xs',
        default: 'h-10',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, loading, leftIcon, rightIcon, ...props }, ref) => {
    const { error } = useFormField();
    const inputVariant = error ? 'error' : variant;

    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            inputVariants({ variant: inputVariant, size }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            loading && 'pr-10',
            className
          )}
          ref={ref}
          {...props}
        />
        {(rightIcon || loading) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            ) : (
              rightIcon
            )}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// Textarea Component
interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, resize = 'vertical', ...props }, ref) => {
    const { error } = useFormField();
    const textareaVariant = error ? 'error' : variant;

    return (
      <textarea
        className={cn(
          inputVariants({ variant: textareaVariant }),
          'min-h-[80px]',
          resize === 'none' && 'resize-none',
          resize === 'both' && 'resize',
          resize === 'horizontal' && 'resize-x',
          resize === 'vertical' && 'resize-y',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input as FormInput,
  Textarea as FormTextarea,
  FormProvider,
};