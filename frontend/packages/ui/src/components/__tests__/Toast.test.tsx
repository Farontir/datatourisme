import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastProvider, ToastViewport } from '../Toast';

// Mock Radix UI components
jest.mock('@radix-ui/react-toast', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
  Viewport: ({ children, ...props }: any) => <div data-testid="toast-viewport" {...props}>{children}</div>,
  Root: ({ children, variant, ...props }: any) => (
    <div data-testid="toast-root" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  Title: ({ children, ...props }: any) => <div data-testid="toast-title" {...props}>{children}</div>,
  Description: ({ children, ...props }: any) => <div data-testid="toast-description" {...props}>{children}</div>,
  Close: ({ children, ...props }: any) => (
    <button data-testid="toast-close" {...props}>
      {children}
    </button>
  ),
  Action: ({ children, ...props }: any) => (
    <button data-testid="toast-action" {...props}>
      {children}
    </button>
  ),
}));

describe('Toast Components', () => {
  describe('ToastProvider', () => {
    it('renders children correctly', () => {
      render(
        <ToastProvider>
          <div>Test content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('ToastViewport', () => {
    it('renders with correct classes', () => {
      render(<ToastViewport />);

      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toBeInTheDocument();
      expect(viewport).toHaveClass('fixed', 'top-0', 'z-[100]');
    });

    it('applies custom className', () => {
      render(<ToastViewport className="custom-class" />);

      const viewport = screen.getByTestId('toast-viewport');
      expect(viewport).toHaveClass('custom-class');
    });
  });

  describe('Toast', () => {
    it('renders with default variant', () => {
      render(<Toast>Test toast</Toast>);

      const toast = screen.getByTestId('toast-root');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent('Test toast');
    });

    it('applies variant classes correctly', () => {
      render(<Toast variant="destructive">Error toast</Toast>);

      const toast = screen.getByTestId('toast-root');
      expect(toast).toHaveAttribute('data-variant', 'destructive');
    });

    it('applies custom className', () => {
      render(<Toast className="custom-toast">Test</Toast>);

      const toast = screen.getByTestId('toast-root');
      expect(toast).toHaveClass('custom-toast');
    });
  });

  describe('ToastTitle', () => {
    it('renders title text', () => {
      render(<ToastTitle>Toast Title</ToastTitle>);

      const title = screen.getByTestId('toast-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Toast Title');
    });

    it('applies correct classes', () => {
      render(<ToastTitle className="custom-title">Title</ToastTitle>);

      const title = screen.getByTestId('toast-title');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('ToastDescription', () => {
    it('renders description text', () => {
      render(<ToastDescription>Toast description</ToastDescription>);

      const description = screen.getByTestId('toast-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('Toast description');
    });

    it('applies correct classes', () => {
      render(<ToastDescription className="custom-desc">Description</ToastDescription>);

      const description = screen.getByTestId('toast-description');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('ToastClose', () => {
    it('renders close button', () => {
      render(<ToastClose />);

      const closeButton = screen.getByTestId('toast-close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('toast-close', '');
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<ToastClose onClick={handleClick} />);

      const closeButton = screen.getByTestId('toast-close');
      fireEvent.click(closeButton);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complete Toast', () => {
    it('renders complete toast with all components', () => {
      render(
        <ToastProvider>
          <Toast variant="success">
            <div className="grid gap-1">
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Operation completed successfully</ToastDescription>
            </div>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
      expect(screen.getByTestId('toast-root')).toBeInTheDocument();
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success');
      expect(screen.getByTestId('toast-description')).toHaveTextContent('Operation completed successfully');
      expect(screen.getByTestId('toast-close')).toBeInTheDocument();
    });
  });
});