import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormInput,
  FormTextarea,
  FormProvider,
} from '../components/Form';
import { SearchableSelect, MultiSelect } from '../components/SelectAdvanced';
import { FormWizard, WizardStep } from '../components/FormWizard';
import { Button } from '../components/Button';
import { useAutoSave } from '../hooks/use-auto-save';
import { useState } from 'react';

const meta: Meta = {
  title: 'UI/Form',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

// Basic Form Schema
const basicFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  tags: z.array(z.string()).min(1, 'Please select at least one tag'),
});

type BasicFormData = z.infer<typeof basicFormSchema>;

// Basic Form Story
function BasicFormDemo() {
  const form = useForm<BasicFormData>({
    resolver: zodResolver(basicFormSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
      category: '',
      tags: [],
    },
  });

  const onSubmit = (data: BasicFormData) => {
    console.log('Form submitted:', data);
    alert('Form submitted! Check console for data.');
  };

  const categoryOptions = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'sales', label: 'Sales Question' },
    { value: 'feedback', label: 'Feedback' },
  ];

  const tagOptions = [
    { value: 'urgent', label: 'Urgent', description: 'Requires immediate attention' },
    { value: 'bug', label: 'Bug Report', description: 'Something is not working' },
    { value: 'feature', label: 'Feature Request', description: 'New functionality needed' },
    { value: 'improvement', label: 'Improvement', description: 'Enhancement to existing feature' },
  ];

  return (
    <div className="w-full max-w-md space-y-6">
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <FormInput placeholder="Enter your name" {...field} />
                </FormControl>
                <FormDescription>
                  Your full name as it appears on your ID.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <FormInput type="email" placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={categoryOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a category"
                    clearable
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={tagOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select tags"
                    max={3}
                  />
                </FormControl>
                <FormDescription>
                  Select up to 3 tags that best describe your inquiry.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <FormTextarea
                    placeholder="Enter your message"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Submit
          </Button>
        </Form>
      </FormProvider>
    </div>
  );
}

export const BasicForm: StoryObj = {
  render: () => <BasicFormDemo />,
  parameters: {
    docs: {
      description: {
        story: 'A complete form example with validation, searchable select, and multi-select components.',
      },
    },
  },
};

// Auto-save Form Story
function AutoSaveFormDemo() {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
      draft: true,
    },
  });

  const { save, isSaving } = useAutoSave({
    form,
    onSave: async (data) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSaved(new Date());
      console.log('Auto-saved:', data);
    },
    delay: 2000,
    saveOnlyWhenValid: false,
  });

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Auto-save Form</h3>
        <div className="text-sm text-neutral-600">
          {isSaving ? (
            <span className="text-blue-600">Saving...</span>
          ) : lastSaved ? (
            <span>Saved at {lastSaved.toLocaleTimeString()}</span>
          ) : (
            <span>Not saved</span>
          )}
        </div>
      </div>

      <FormProvider {...form}>
        <Form className="space-y-4">
          <FormField
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <FormInput placeholder="Enter title" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <FormTextarea
                    placeholder="Start typing..."
                    className="min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Changes are automatically saved as you type.
                </FormDescription>
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button onClick={save} variant="outline" disabled={isSaving}>
              Save Now
            </Button>
            <Button type="submit">
              Publish
            </Button>
          </div>
        </Form>
      </FormProvider>
    </div>
  );
}

export const AutoSaveForm: StoryObj = {
  render: () => <AutoSaveFormDemo />,
  parameters: {
    docs: {
      description: {
        story: 'A form with auto-save functionality that saves changes as the user types.',
      },
    },
  },
};

// Wizard Form Story
const wizardSteps = [
  {
    id: 'personal',
    title: 'Personal Info',
    description: 'Basic personal information',
  },
  {
    id: 'contact',
    title: 'Contact',
    description: 'Contact details',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Your preferences',
    optional: true,
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and submit',
  },
];

function WizardFormDemo() {
  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      newsletter: false,
      notifications: [],
    },
  });

  const onComplete = () => {
    console.log('Wizard completed:', form.getValues());
    alert('Wizard completed! Check console for data.');
  };

  return (
    <div className="w-full max-w-2xl">
      <FormProvider {...form}>
        <FormWizard
          steps={wizardSteps}
          onComplete={onComplete}
          form={form}
          showProgress
          showStepNumbers
          allowStepNavigation
        >
          <WizardStep step={0}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <FormInput placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <FormInput placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </WizardStep>

          <WizardStep step={1}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Contact Information</h2>
              <FormField
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <FormInput type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <FormInput placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </WizardStep>

          <WizardStep step={2}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Preferences</h2>
              <p className="text-neutral-600">This step is optional.</p>
              
              <FormField
                name="notifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Preferences</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={[
                          { value: 'email', label: 'Email Notifications' },
                          { value: 'sms', label: 'SMS Notifications' },
                          { value: 'push', label: 'Push Notifications' },
                        ]}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select notification types"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </WizardStep>

          <WizardStep step={3}>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Review & Submit</h2>
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800">
                <h3 className="font-medium mb-2">Summary</h3>
                <pre className="text-sm">
                  {JSON.stringify(form.watch(), null, 2)}
                </pre>
              </div>
            </div>
          </WizardStep>
        </FormWizard>
      </FormProvider>
    </div>
  );
}

export const WizardForm: StoryObj = {
  render: () => <WizardFormDemo />,
  parameters: {
    docs: {
      description: {
        story: 'A multi-step wizard form with progress indicator and step navigation.',
      },
    },
  },
};