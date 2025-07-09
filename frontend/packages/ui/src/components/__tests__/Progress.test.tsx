import React from 'react';
import { render, screen } from '@testing-library/react';
import { Progress, CircularProgress } from '../Progress';

describe('Progress Components', () => {
  describe('Progress', () => {
    it('renders progress bar with default value', () => {
      render(<Progress data-testid="progress" />);
      
      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('renders progress bar with custom value', () => {
      render(<Progress value={50} data-testid="progress" />);
      
      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('renders progress bar with custom max value', () => {
      render(<Progress value={25} max={50} data-testid="progress" />);
      
      const progressBar = screen.getByTestId('progress');
      expect(progressBar).toHaveAttribute('aria-valuemax', '50');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });

    it('shows percentage when showPercentage is true', () => {
      render(<Progress value={75} showPercentage />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('applies different size variants', () => {
      const { rerender } = render(<Progress size="sm" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('h-1');

      rerender(<Progress size="default" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('h-2');

      rerender(<Progress size="lg" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('h-3');
    });

    it('applies different color variants', () => {
      const { rerender } = render(<Progress variant="success" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('bg-success-200');

      rerender(<Progress variant="error" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('bg-error-200');

      rerender(<Progress variant="warning" data-testid="progress" />);
      expect(screen.getByTestId('progress')).toHaveClass('bg-warning-200');
    });
  });

  describe('CircularProgress', () => {
    it('renders circular progress with default props', () => {
      render(<CircularProgress data-testid="circular-progress" />);
      
      const circularProgress = screen.getByTestId('circular-progress');
      expect(circularProgress).toBeInTheDocument();
      
      const svg = circularProgress.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('shows percentage when showPercentage is true', () => {
      render(<CircularProgress value={60} showPercentage />);
      
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('applies custom size', () => {
      render(<CircularProgress size={64} data-testid="circular-progress" />);
      
      const circularProgress = screen.getByTestId('circular-progress');
      const svg = circularProgress.querySelector('svg');
      expect(svg).toHaveAttribute('width', '64');
      expect(svg).toHaveAttribute('height', '64');
    });

    it('applies different color variants', () => {
      render(<CircularProgress variant="success" data-testid="circular-progress" />);
      
      const circularProgress = screen.getByTestId('circular-progress');
      const progressCircle = circularProgress.querySelectorAll('circle')[1]; // Second circle is the progress
      expect(progressCircle).toHaveClass('stroke-success-600');
    });

    it('calculates correct percentage', () => {
      render(<CircularProgress value={30} max={60} showPercentage />);
      
      expect(screen.getByText('50%')).toBeInTheDocument(); // 30/60 * 100 = 50%
    });
  });
});