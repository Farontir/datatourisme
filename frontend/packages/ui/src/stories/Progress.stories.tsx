import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { Progress, CircularProgress } from '../components/Progress';
import { Button } from '../components/Button';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success', 'warning', 'error', 'info'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'default', 'lg'],
    },
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
    variant: 'default',
    size: 'default',
    showPercentage: false,
  },
  render: (args) => (
    <div className="w-80">
      <Progress {...args} />
    </div>
  ),
};

export const WithPercentage: Story = {
  render: () => (
    <div className="w-80">
      <Progress value={75} showPercentage />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm font-medium mb-2">Small</p>
        <Progress value={40} size="sm" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Default</p>
        <Progress value={60} size="default" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Large</p>
        <Progress value={80} size="lg" />
      </div>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <p className="text-sm font-medium mb-2">Default</p>
        <Progress value={60} variant="default" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Success</p>
        <Progress value={100} variant="success" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Warning</p>
        <Progress value={70} variant="warning" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Error</p>
        <Progress value={30} variant="error" />
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Info</p>
        <Progress value={45} variant="info" />
      </div>
    </div>
  ),
};

// Animated progress demo
function AnimatedProgressDemo() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-80">
      <Progress value={progress} showPercentage />
    </div>
  );
}

export const Animated: Story = {
  render: () => <AnimatedProgressDemo />,
};

// Circular Progress Stories
const CircularMeta: Meta<typeof CircularProgress> = {
  title: 'UI/CircularProgress',
  component: CircularProgress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const CircularDefault: StoryObj<typeof CircularProgress> = {
  args: {
    value: 65,
    variant: 'default',
    size: 48,
    showPercentage: false,
  },
  render: (args) => <CircularProgress {...args} />,
};

export const CircularWithPercentage: StoryObj<typeof CircularProgress> = {
  render: () => <CircularProgress value={75} showPercentage />,
};

export const CircularSizes: StoryObj<typeof CircularProgress> = {
  render: () => (
    <div className="flex items-center space-x-8">
      <div className="text-center">
        <CircularProgress value={60} size={32} showPercentage />
        <p className="text-sm mt-2">Small (32px)</p>
      </div>
      <div className="text-center">
        <CircularProgress value={60} size={48} showPercentage />
        <p className="text-sm mt-2">Default (48px)</p>
      </div>
      <div className="text-center">
        <CircularProgress value={60} size={64} showPercentage />
        <p className="text-sm mt-2">Large (64px)</p>
      </div>
      <div className="text-center">
        <CircularProgress value={60} size={96} showPercentage />
        <p className="text-sm mt-2">XL (96px)</p>
      </div>
    </div>
  ),
};

export const CircularVariants: StoryObj<typeof CircularProgress> = {
  render: () => (
    <div className="flex items-center space-x-8">
      <div className="text-center">
        <CircularProgress value={60} variant="default" showPercentage />
        <p className="text-sm mt-2">Default</p>
      </div>
      <div className="text-center">
        <CircularProgress value={100} variant="success" showPercentage />
        <p className="text-sm mt-2">Success</p>
      </div>
      <div className="text-center">
        <CircularProgress value={70} variant="warning" showPercentage />
        <p className="text-sm mt-2">Warning</p>
      </div>
      <div className="text-center">
        <CircularProgress value={30} variant="error" showPercentage />
        <p className="text-sm mt-2">Error</p>
      </div>
      <div className="text-center">
        <CircularProgress value={45} variant="info" showPercentage />
        <p className="text-sm mt-2">Info</p>
      </div>
    </div>
  ),
};

// Interactive demo
function InteractiveProgressDemo() {
  const [progress, setProgress] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  const simulate = () => {
    setIsLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLoading(false);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6 w-80">
      <div className="space-y-4">
        <Progress value={progress} showPercentage variant={progress === 100 ? 'success' : 'default'} />
        <div className="flex justify-center">
          <CircularProgress value={progress} showPercentage variant={progress === 100 ? 'success' : 'default'} />
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <Button onClick={simulate} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Simulate Progress'}
        </Button>
        <Button variant="outline" onClick={() => setProgress(50)} disabled={isLoading}>
          Reset
        </Button>
      </div>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveProgressDemo />,
};