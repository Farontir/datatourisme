import type { Meta, StoryObj } from '@storybook/react';
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastProvider, ToastViewport } from '../components/Toast';
import { Button } from '../components/Button';
import { useToast } from '../hooks/use-toast';
import { Toaster } from '../components/Toaster';

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Component to demonstrate toast functionality
function ToastDemo() {
  const { toast, success, error, warning, info } = useToast();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() =>
            toast({
              title: 'Notification',
              description: 'This is a default toast message.',
            })
          }
        >
          Default Toast
        </Button>
        
        <Button
          variant="destructive"
          onClick={() =>
            error('Something went wrong!', 'Error')
          }
        >
          Error Toast
        </Button>
        
        <Button
          onClick={() =>
            success('Your action was successful!', 'Success')
          }
        >
          Success Toast
        </Button>
        
        <Button
          onClick={() =>
            warning('Please check your input.', 'Warning')
          }
        >
          Warning Toast
        </Button>
        
        <Button
          onClick={() =>
            info('Here is some useful information.', 'Info')
          }
        >
          Info Toast
        </Button>

        <Button
          onClick={() =>
            toast({
              title: 'Undo',
              description: 'Your file has been deleted.',
              action: {
                label: 'Undo',
                onClick: () => console.log('Undo clicked'),
              },
            })
          }
        >
          Toast with Action
        </Button>
      </div>
      <Toaster />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <ToastDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing different toast variants and features.',
      },
    },
  },
};

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <div className="grid gap-1">
          <ToastTitle>Notification</ToastTitle>
          <ToastDescription>This is a default toast message.</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const Destructive: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="destructive">
        <div className="grid gap-1">
          <ToastTitle>Error</ToastTitle>
          <ToastDescription>Something went wrong!</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const Success: Story = {
  render: () => (
    <ToastProvider>
      <Toast variant="success">
        <div className="grid gap-1">
          <ToastTitle>Success</ToastTitle>
          <ToastDescription>Your action was successful!</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const WithAction: Story = {
  render: () => (
    <ToastProvider>
      <Toast>
        <div className="grid gap-1">
          <ToastTitle>File Deleted</ToastTitle>
          <ToastDescription>Your file has been moved to trash.</ToastDescription>
        </div>
        <button
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-neutral-100"
          onClick={() => console.log('Undo clicked')}
        >
          Undo
        </button>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};