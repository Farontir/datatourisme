import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge Component', () => {
  it('renders badge with text content', () => {
    render(<Badge>Badge Text</Badge>);
    
    expect(screen.getByText('Badge Text')).toBeInTheDocument();
  });

  it('applies default variant styling', () => {
    render(<Badge data-testid="badge">Default Badge</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-neutral-900');
    expect(badge).toHaveClass('text-neutral-50');
  });

  it('applies secondary variant styling', () => {
    render(<Badge variant="secondary" data-testid="badge">Secondary Badge</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-neutral-100');
    expect(badge).toHaveClass('text-neutral-900');
  });

  it('applies destructive variant styling', () => {
    render(<Badge variant="destructive" data-testid="badge">Destructive Badge</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-red-500');
    expect(badge).toHaveClass('text-neutral-50');
  });

  it('applies outline variant styling', () => {
    render(<Badge variant="outline" data-testid="badge">Outline Badge</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('text-neutral-950');
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class" data-testid="badge">Custom Badge</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders with other HTML attributes', () => {
    render(<Badge data-testid="badge" title="Badge tooltip">Badge with attributes</Badge>);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('title', 'Badge tooltip');
  });

  it('renders as different HTML elements using asChild pattern', () => {
    render(
      <Badge data-testid="badge">
        <a href="/link">Link Badge</a>
      </Badge>
    );
    
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Link Badge' })).toBeInTheDocument();
  });
});