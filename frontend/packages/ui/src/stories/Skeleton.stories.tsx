import type { Meta, StoryObj } from '@storybook/react';
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonTable, 
  SkeletonList 
} from '../components/Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'text', 'avatar', 'button', 'card'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
    className: 'h-12 w-64',
  },
  render: (args) => <Skeleton {...args} />,
};

export const Text: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonText lines={3} />
    </div>
  ),
};

export const Avatar: Story = {
  render: () => <SkeletonAvatar />,
};

export const Button: Story = {
  render: () => <SkeletonButton />,
};

export const Card: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonCard />
    </div>
  ),
};

export const Table: Story = {
  render: () => (
    <div className="w-full max-w-4xl">
      <SkeletonTable rows={5} columns={4} />
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className="w-80">
      <SkeletonList items={5} showAvatar />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Default</h3>
        <Skeleton variant="default" className="h-12 w-64" />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Text</h3>
        <div className="space-y-2">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-4 w-1/2" />
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Avatar</h3>
        <div className="flex space-x-4">
          <Skeleton variant="avatar" className="h-8 w-8" />
          <Skeleton variant="avatar" className="h-12 w-12" />
          <Skeleton variant="avatar" className="h-16 w-16" />
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Button</h3>
        <div className="flex space-x-4">
          <Skeleton variant="button" className="h-8 w-16" />
          <Skeleton variant="button" className="h-10 w-24" />
          <Skeleton variant="button" className="h-12 w-32" />
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-3">Card</h3>
        <Skeleton variant="card" className="h-48 w-80" />
      </div>
    </div>
  ),
};

export const ComplexLayout: Story = {
  render: () => (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SkeletonAvatar className="h-12 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <SkeletonButton className="h-10 w-20" />
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <SkeletonList items={4} showAvatar={false} />
        </div>
        
        {/* Content */}
        <div className="md:col-span-2 space-y-6">
          <SkeletonCard />
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <SkeletonText lines={4} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t pt-6">
        <SkeletonTable rows={3} columns={3} />
      </div>
    </div>
  ),
};

export const ProductGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const BlogPost: Story = {
  render: () => (
    <article className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center space-x-4">
          <SkeletonAvatar className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      
      {/* Featured image */}
      <Skeleton className="aspect-video w-full rounded-lg" />
      
      {/* Content */}
      <div className="space-y-4">
        <SkeletonText lines={6} />
        <Skeleton className="h-48 w-full rounded-lg" />
        <SkeletonText lines={4} />
      </div>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
    </article>
  ),
};