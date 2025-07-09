import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithA11y, expectNoA11yViolations } from '../../../test-utils/test-utils';
import { AppShell } from '@/ui/components/AppShell';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('AppShell', () => {
  const mockProps = {
    header: <header data-testid="header">Header Content</header>,
    sidebar: <nav data-testid="sidebar">Sidebar Content</nav>,
    children: <main data-testid="main">Main Content</main>,
  };

  it('renders all sections with proper accessibility', async () => {
    const { a11yResults } = await renderWithA11y(<AppShell {...mockProps} />);
    
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('shows mobile menu button on small screens', async () => {
    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    await renderWithA11y(<AppShell {...mockProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles mobile sidebar when menu button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    await renderWithA11y(<AppShell {...mockProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    
    // Initially closed
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    
    // Click to open
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    
    // Click to close
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes mobile sidebar when clicking outside', async () => {
    const user = userEvent.setup();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    await renderWithA11y(<AppShell {...mockProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    
    // Open sidebar
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    
    // Click on main content area
    const mainContent = screen.getByTestId('main');
    await user.click(mainContent);
    
    // Should close sidebar
    await waitFor(() => {
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('handles keyboard navigation properly', async () => {
    const user = userEvent.setup();
    
    await renderWithA11y(<AppShell {...mockProps} />);
    
    // Focus should be manageable within the shell
    const menuButton = screen.queryByRole('button', { name: /menu/i });
    
    if (menuButton) {
      await user.tab();
      expect(menuButton).toHaveFocus();
      
      // Enter should open menu
      await user.keyboard('{Enter}');
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      // Escape should close menu
      await user.keyboard('{Escape}');
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('has proper responsive layout classes', async () => {
    const { container } = await renderWithA11y(<AppShell {...mockProps} />);
    
    // Check for responsive classes
    const shellContainer = container.firstChild as HTMLElement;
    expect(shellContainer).toHaveClass('flex', 'min-h-screen');
    
    // Check for mobile-responsive elements
    const sidebar = screen.getByTestId('sidebar').parentElement;
    expect(sidebar).toHaveClass('md:flex'); // Hidden on mobile, visible on desktop
  });

  it('maintains accessibility when sidebar is hidden', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { a11yResults } = await renderWithA11y(<AppShell {...mockProps} />);
    
    // Sidebar should be properly hidden with aria-hidden or similar
    const sidebar = screen.getByTestId('sidebar');
    const sidebarContainer = sidebar.parentElement;
    
    // Should have appropriate hiding mechanism
    expect(
      sidebarContainer?.classList.contains('hidden') ||
      sidebarContainer?.getAttribute('aria-hidden') === 'true' ||
      getComputedStyle(sidebarContainer!).display === 'none'
    ).toBeTruthy();
    
    expectNoA11yViolations(a11yResults);
  });

  it('provides skip link functionality', async () => {
    const user = userEvent.setup();
    
    await renderWithA11y(<AppShell {...mockProps} />);
    
    // Look for skip link
    const skipLink = screen.queryByText(/skip to main content/i) || 
                     screen.queryByText(/aller au contenu principal/i);
    
    if (skipLink) {
      await user.click(skipLink);
      
      // Main content should receive focus
      const mainContent = screen.getByTestId('main');
      expect(mainContent).toHaveFocus();
    }
  });

  it('supports custom className prop', async () => {
    const customClass = 'custom-shell-class';
    const { container } = await renderWithA11y(
      <AppShell {...mockProps} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles missing sidebar gracefully', async () => {
    const { a11yResults } = await renderWithA11y(
      <AppShell 
        header={mockProps.header}
        children={mockProps.children}
      />
    );
    
    // Should still render header and main content
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    
    // No sidebar should be present
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    
    expectNoA11yViolations(a11yResults);
  });

  it('handles window resize events properly', async () => {
    const user = userEvent.setup();
    
    // Start with mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    await renderWithA11y(<AppShell {...mockProps} />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    
    // Open mobile sidebar
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    
    // Simulate resize to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    
    // Mobile menu should close/hide on desktop
    await waitFor(() => {
      // Either the button is hidden or the sidebar is closed
      const button = screen.queryByRole('button', { name: /menu/i });
      if (button) {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      }
    });
  });
});