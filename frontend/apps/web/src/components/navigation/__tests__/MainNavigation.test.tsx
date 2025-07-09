import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithA11y, expectNoA11yViolations } from '../../../test-utils/test-utils';
import { MainNavigation } from '../MainNavigation';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/search',
}));

describe('MainNavigation', () => {
  it('renders all navigation items with proper accessibility', async () => {
    const { a11yResults } = await renderWithA11y(<MainNavigation />);
    
    expect(screen.getByRole('link', { name: /accueil/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recherche/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /carte/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /favoris/i })).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('renders as vertical navigation', async () => {
    const { a11yResults } = await renderWithA11y(
      <MainNavigation orientation="vertical" />
    );
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
    
    // Check that all items are rendered as links
    expect(screen.getByRole('link', { name: /accueil/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /recherche/i })).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('highlights active navigation item', async () => {
    // Mock pathname to be /search
    jest.mocked(require('next/navigation').usePathname).mockReturnValue('/search');
    
    await renderWithA11y(<MainNavigation />);
    
    const searchLink = screen.getByRole('link', { name: /recherche/i });
    expect(searchLink).toHaveClass(/bg-neutral-100|text-neutral-900/);
  });

  it('has proper navigation structure', async () => {
    const { a11yResults } = await renderWithA11y(<MainNavigation />);
    
    // Check for proper navigation landmark
    const navigation = screen.getByRole('navigation') || 
                      screen.getByRole('list') ||
                      document.querySelector('nav, [role="navigation"]');
    expect(navigation).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('includes icons with text for better accessibility', async () => {
    await renderWithA11y(<MainNavigation orientation="vertical" />);
    
    const links = screen.getAllByRole('link');
    
    // Each link should have both icon and text
    links.forEach(link => {
      expect(link).toHaveTextContent(/accueil|recherche|carte|favoris/i);
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    await renderWithA11y(<MainNavigation />);
    
    const firstLink = screen.getByRole('link', { name: /accueil/i });
    
    await user.tab();
    expect(firstLink).toHaveFocus();
    
    await user.tab();
    const secondLink = screen.getByRole('link', { name: /recherche/i });
    expect(secondLink).toHaveFocus();
  });

  it('has proper link href attributes', async () => {
    await renderWithA11y(<MainNavigation />);
    
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /recherche/i })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: /carte/i })).toHaveAttribute('href', '/map');
    expect(screen.getByRole('link', { name: /favoris/i })).toHaveAttribute('href', '/favorites');
  });
});