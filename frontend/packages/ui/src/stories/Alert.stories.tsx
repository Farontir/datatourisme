import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription, AlertIcon } from '../components/Alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'success', 'warning', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertIcon variant={args.variant} />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="max-w-md">
      <AlertIcon variant="destructive" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert variant="success" className="max-w-md">
      <AlertIcon variant="success" />
      <AlertTitle>Success</AlertTitle>
      <AlertDescription>
        Your changes have been saved successfully.
      </AlertDescription>
    </Alert>
  ),
};

export const Warning: Story = {
  render: () => (
    <Alert variant="warning" className="max-w-md">
      <AlertIcon variant="warning" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        This action cannot be undone. Please proceed with caution.
      </AlertDescription>
    </Alert>
  ),
};

export const Info: Story = {
  render: () => (
    <Alert variant="info" className="max-w-md">
      <AlertIcon variant="info" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        New features are available! Check out our latest updates.
      </AlertDescription>
    </Alert>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <Alert className="max-w-md">
      <AlertIcon />
      <AlertDescription>
        A simple alert message without a title.
      </AlertDescription>
    </Alert>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Alert variant="info" className="max-w-lg">
      <AlertIcon variant="info" />
      <AlertTitle>System Maintenance</AlertTitle>
      <AlertDescription>
        We will be performing scheduled maintenance on our servers from 2:00 AM to 4:00 AM UTC on Sunday, March 15th. 
        During this time, some services may be temporarily unavailable. We apologize for any inconvenience this may cause 
        and appreciate your patience.
      </AlertDescription>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <Alert variant="default">
        <AlertIcon variant="default" />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>This is a default alert message.</AlertDescription>
      </Alert>
      
      <Alert variant="info">
        <AlertIcon variant="info" />
        <AlertTitle>Info Alert</AlertTitle>
        <AlertDescription>This is an informational alert message.</AlertDescription>
      </Alert>
      
      <Alert variant="success">
        <AlertIcon variant="success" />
        <AlertTitle>Success Alert</AlertTitle>
        <AlertDescription>This is a success alert message.</AlertDescription>
      </Alert>
      
      <Alert variant="warning">
        <AlertIcon variant="warning" />
        <AlertTitle>Warning Alert</AlertTitle>
        <AlertDescription>This is a warning alert message.</AlertDescription>
      </Alert>
      
      <Alert variant="destructive">
        <AlertIcon variant="destructive" />
        <AlertTitle>Error Alert</AlertTitle>
        <AlertDescription>This is an error alert message.</AlertDescription>
      </Alert>
    </div>
  ),
};