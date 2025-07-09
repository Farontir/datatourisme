import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Button } from '@datatourisme/ui';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.',
      },
    },
    // Chromatic configuration for visual testing
    chromatic: {
      viewports: [375, 768, 1440],
      pauseAnimationsAtEnd: true,
      delay: 300,
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state',
    },
    children: {
      control: 'text',
      description: 'The content of the button',
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic button variants
export const Default: Story = {
  args: {
    children: 'Default Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete Item',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link Button',
  },
};

// Button sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🔍',
  },
};

// Button states
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading Button',
  },
};

// Interactive tests
export const ClickInteraction: Story = {
  args: {
    children: 'Click Me',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    // Test that button is clickable
    await expect(button).toBeEnabled();
    await userEvent.click(button);
    
    // Verify click handler was called
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export const KeyboardInteraction: Story = {
  args: {
    children: 'Keyboard Navigation',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    // Test keyboard navigation
    await userEvent.tab();
    await expect(button).toHaveFocus();
    
    // Test space key activation
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalled();
  },
};

// Visual regression tests
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button>Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon">🔍</Button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>
    </div>
  ),
  parameters: {
    chromatic: {
      modes: {
        mobile: { viewport: { width: 375, height: 667 } },
        tablet: { viewport: { width: 768, height: 1024 } },
        desktop: { viewport: { width: 1440, height: 900 } },
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    children: 'Dark Mode Button',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: {
      modes: {
        dark: { backgrounds: { default: 'dark' } },
      },
    },
  },
};

// Accessibility tests
export const AccessibilityTest: Story = {
  args: {
    children: 'Accessible Button',
    'aria-label': 'Submit form',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    
    // Test accessibility attributes
    await expect(button).toHaveAttribute('aria-label', 'Submit form');
    await expect(button).toBeEnabled();
    await expect(button).toHaveAccessibleName();
  },
};

// Long text test
export const LongText: Story = {
  args: {
    children: 'This is a very long button text that should handle wrapping gracefully',
  },
  parameters: {
    chromatic: {
      modes: {
        mobile: { viewport: { width: 375, height: 667 } },
      },
    },
  },
};

// Focus states test
export const FocusStates: Story = {
  render: () => (
    <div className="space-y-4">
      <Button className="focus:ring-2 focus:ring-blue-500">Focus Ring</Button>
      <Button variant="outline" className="focus:ring-2 focus:ring-red-500">
        Custom Focus
      </Button>
    </div>
  ),
  parameters: {
    chromatic: {
      // Skip for now as focus states are hard to test visually
      disable: true,
    },
  },
};