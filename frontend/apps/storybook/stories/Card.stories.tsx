import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@datatourisme/ui';
import { Button } from '@datatourisme/ui';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component with header, content, and footer sections.',
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
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    children: {
      control: 'text',
      description: 'Card content',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic card
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

// Card with image
export const WithImage: Story = {
  render: () => (
    <Card className="w-80">
      <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
        <span className="text-gray-500">Image Placeholder</span>
      </div>
      <CardHeader>
        <CardTitle>Tourism Destination</CardTitle>
        <CardDescription>Beautiful location in France</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Discover the hidden gems of this amazing destination.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Learn More</Button>
        <Button>Book Now</Button>
      </CardFooter>
    </Card>
  ),
};

// Interactive card
export const Interactive: Story = {
  render: () => (
    <Card className="w-80 hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click to interact</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card responds to hover and click events.</p>
      </CardContent>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('generic');
    
    // Test hover interaction
    await userEvent.hover(card);
    await expect(card).toHaveClass('hover:shadow-lg');
  },
};

// Card with form
export const WithForm: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Contact Form</CardTitle>
        <CardDescription>Get in touch with us</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Your message"
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Send Message</Button>
      </CardFooter>
    </Card>
  ),
};

// Card variants
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>Standard card styling</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is a default card with standard styling.</p>
        </CardContent>
      </Card>
      
      <Card className="w-80 border-2 border-blue-500">
        <CardHeader>
          <CardTitle>Highlighted Card</CardTitle>
          <CardDescription>With blue border</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has a highlighted border.</p>
        </CardContent>
      </Card>
      
      <Card className="w-80 bg-gray-50">
        <CardHeader>
          <CardTitle>Subtle Card</CardTitle>
          <CardDescription>With gray background</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has a subtle background.</p>
        </CardContent>
      </Card>
      
      <Card className="w-80 shadow-lg">
        <CardHeader>
          <CardTitle>Elevated Card</CardTitle>
          <CardDescription>With enhanced shadow</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card has an elevated appearance.</p>
        </CardContent>
      </Card>
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

// Responsive card
export const Responsive: Story = {
  render: () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Responsive Card</CardTitle>
        <CardDescription>Adapts to different screen sizes</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card adjusts its width based on the viewport size.</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full sm:w-auto">Responsive Action</Button>
      </CardFooter>
    </Card>
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

// Dark mode card
export const DarkMode: Story = {
  render: () => (
    <Card className="w-80 bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="text-white">Dark Mode Card</CardTitle>
        <CardDescription className="text-gray-300">
          Card styled for dark theme
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-100">
          This card is designed to work well in dark mode.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
          Dark Action
        </Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: {
      modes: {
        dark: { backgrounds: { default: 'dark' } },
      },
    },
  },
};

// Card with complex content
export const ComplexContent: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Hotel Booking</CardTitle>
        <CardDescription>Luxury hotel in Paris</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Rating:</span>
            <div className="flex items-center">
              <span className="text-yellow-500">★★★★★</span>
              <span className="ml-1 text-sm text-gray-600">(4.8)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Price:</span>
            <span className="text-lg font-bold">€299/night</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Availability:</span>
            <span className="text-green-600">Available</span>
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Amenities:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Free WiFi</li>
              <li>• Swimming Pool</li>
              <li>• Spa & Wellness</li>
              <li>• Restaurant</li>
            </ul>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          View Details
        </Button>
        <Button className="flex-1">Book Now</Button>
      </CardFooter>
    </Card>
  ),
};

// Accessibility test
export const AccessibilityTest: Story = {
  render: () => (
    <Card className="w-80" role="article" aria-labelledby="card-title">
      <CardHeader>
        <CardTitle id="card-title">Accessible Card</CardTitle>
        <CardDescription>
          Card with proper ARIA attributes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          This card includes proper accessibility attributes for screen readers.
        </p>
      </CardContent>
      <CardFooter>
        <Button aria-describedby="card-title">
          Accessible Action
        </Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('article');
    const title = canvas.getByText('Accessible Card');
    const button = canvas.getByRole('button');
    
    // Test accessibility attributes
    await expect(card).toHaveAttribute('aria-labelledby', 'card-title');
    await expect(title).toHaveAttribute('id', 'card-title');
    await expect(button).toHaveAttribute('aria-describedby', 'card-title');
  },
};