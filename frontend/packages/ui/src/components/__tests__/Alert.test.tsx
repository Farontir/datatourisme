import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription, AlertIcon } from '../Alert';

describe('Alert Components', () => {
  describe('Alert', () => {
    it('renders with default variant', () => {
      render(<Alert>Test alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Test alert');
    });

    it('applies variant classes correctly', () => {
      render(<Alert variant="destructive">Error alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-error-500/50', 'text-error-900', 'bg-error-50');
    });

    it('applies success variant classes', () => {
      render(<Alert variant="success">Success alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-success-500/50', 'text-success-900', 'bg-success-50');
    });

    it('applies warning variant classes', () => {
      render(<Alert variant="warning">Warning alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-warning-500/50', 'text-warning-900', 'bg-warning-50');
    });

    it('applies info variant classes', () => {
      render(<Alert variant="info">Info alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-info-500/50', 'text-info-900', 'bg-info-50');
    });

    it('applies custom className', () => {
      render(<Alert className="custom-alert">Test</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert');
    });

    it('has correct accessibility attributes', () => {
      render(<Alert>Alert content</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });
  });

  describe('AlertTitle', () => {
    it('renders title text', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);

      const title = screen.getByText('Alert Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H5');
    });

    it('applies correct classes', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>);

      const title = screen.getByText('Title');
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight', 'custom-title');
    });
  });

  describe('AlertDescription', () => {
    it('renders description text', () => {
      render(<AlertDescription>Alert description</AlertDescription>);

      const description = screen.getByText('Alert description');
      expect(description).toBeInTheDocument();
    });

    it('applies correct classes', () => {
      render(<AlertDescription className="custom-desc">Description</AlertDescription>);

      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-sm', '[&_p]:leading-relaxed', 'custom-desc');
    });

    it('can contain HTML content', () => {
      render(
        <AlertDescription>
          <p>Paragraph content</p>
          <span>Span content</span>
        </AlertDescription>
      );

      expect(screen.getByText('Paragraph content')).toBeInTheDocument();
      expect(screen.getByText('Span content')).toBeInTheDocument();
    });
  });

  describe('AlertIcon', () => {
    it('renders default icon', () => {
      render(<AlertIcon />);

      const icon = screen.getByTestId('lucide-info');
      expect(icon).toBeInTheDocument();
    });

    it('renders destructive icon', () => {
      render(<AlertIcon variant="destructive" />);

      const icon = screen.getByTestId('lucide-x-circle');
      expect(icon).toBeInTheDocument();
    });

    it('renders success icon', () => {
      render(<AlertIcon variant="success" />);

      const icon = screen.getByTestId('lucide-check-circle');
      expect(icon).toBeInTheDocument();
    });

    it('renders warning icon', () => {
      render(<AlertIcon variant="warning" />);

      const icon = screen.getByTestId('lucide-alert-triangle');
      expect(icon).toBeInTheDocument();
    });

    it('renders info icon', () => {
      render(<AlertIcon variant="info" />);

      const icon = screen.getByTestId('lucide-info');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Complete Alert', () => {
    it('renders complete alert with all components', () => {
      render(
        <Alert variant="warning">
          <AlertIcon variant="warning" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This is a warning message with important information.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('border-warning-500/50');

      expect(screen.getByTestId('lucide-alert-triangle')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This is a warning message with important information.')).toBeInTheDocument();
    });

    it('works without title', () => {
      render(
        <Alert variant="info">
          <AlertIcon variant="info" />
          <AlertDescription>Info message without title</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('lucide-info')).toBeInTheDocument();
      expect(screen.getByText('Info message without title')).toBeInTheDocument();
    });

    it('works without icon', () => {
      render(
        <Alert>
          <AlertTitle>Title Only</AlertTitle>
          <AlertDescription>Description without icon</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Title Only')).toBeInTheDocument();
      expect(screen.getByText('Description without icon')).toBeInTheDocument();
    });
  });
});