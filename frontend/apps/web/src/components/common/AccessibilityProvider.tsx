'use client';

import { useEffect } from 'react';
import { setupAccessibilityMonitoring } from '../../utils/accessibility';

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  useEffect(() => {
    // Setup accessibility monitoring in development
    setupAccessibilityMonitoring();
  }, []);

  return <>{children}</>;
}