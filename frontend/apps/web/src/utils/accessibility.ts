import axe from 'axe-core';

export interface AccessibilityConfig {
  reporter?: 'v1' | 'v2' | 'raw' | 'raw-env' | 'no-passes';
  runOnly?: string[];
  exclude?: string[];
  timeout?: number;
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
  }>;
}

export interface AccessibilityResult {
  violations: AccessibilityViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  timestamp: string;
  url: string;
}

/**
 * Run accessibility audit on the current page
 */
export async function runAccessibilityAudit(
  element: Element | Document = document,
  config: AccessibilityConfig = {}
): Promise<AccessibilityResult> {
  const defaultConfig = {
    reporter: 'v2' as const,
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    timeout: 30000,
    ...config,
  };

  try {
    const results = await axe.run(element, defaultConfig);
    
    return {
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact as any,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary || '',
        })),
      })),
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
  } catch (error) {
    console.error('Accessibility audit failed:', error);
    throw error;
  }
}

/**
 * Run accessibility audit and log results to console
 */
export async function logAccessibilityResults(
  element?: Element | Document,
  config?: AccessibilityConfig
): Promise<void> {
  try {
    const results = await runAccessibilityAudit(element, config);
    
    if (results.violations.length === 0) {
      console.log('✅ No accessibility violations found!');
      return;
    }

    console.group(`🚨 ${results.violations.length} accessibility violation(s) found`);
    
    results.violations.forEach((violation) => {
      console.group(`${violation.impact?.toUpperCase()}: ${violation.id}`);
      console.log('Description:', violation.description);
      console.log('Help:', violation.help);
      console.log('Help URL:', violation.helpUrl);
      
      violation.nodes.forEach((node, index) => {
        console.group(`Node ${index + 1}`);
        console.log('Target:', node.target.join(', '));
        console.log('HTML:', node.html);
        console.log('Failure:', node.failureSummary);
        console.groupEnd();
      });
      
      console.groupEnd();
    });
    
    console.groupEnd();
  } catch (error) {
    console.error('Failed to run accessibility audit:', error);
  }
}

/**
 * Setup accessibility monitoring in development
 */
export function setupAccessibilityMonitoring(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Run audit on page load
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        logAccessibilityResults();
      }, 1000);
    });

    // Add keyboard shortcut to run audit manually (Ctrl/Cmd + Shift + A)
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        logAccessibilityResults();
      }
    });

    // Make accessibility utils available globally in dev
    (window as any).__accessibility = {
      runAudit: runAccessibilityAudit,
      logResults: logAccessibilityResults,
    };
  }
}

/**
 * Check if element has proper ARIA attributes
 */
export function validateAriaAttributes(element: Element): string[] {
  const issues: string[] = [];
  
  // Check for required aria-label or aria-labelledby on interactive elements
  const interactiveElements = element.querySelectorAll('button, input, select, textarea, [role="button"], [role="link"]');
  
  interactiveElements.forEach((el) => {
    const hasAriaLabel = el.hasAttribute('aria-label');
    const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
    const hasTextContent = el.textContent?.trim();
    const hasAltText = el.hasAttribute('alt');
    
    if (!hasAriaLabel && !hasAriaLabelledBy && !hasTextContent && !hasAltText) {
      issues.push(`Element ${el.tagName.toLowerCase()} is missing accessible name`);
    }
  });
  
  return issues;
}

/**
 * Check color contrast ratios
 */
export function checkColorContrast(element: Element): Promise<any[]> {
  return axe.run(element, {
    runOnly: ['color-contrast'],
  }).then(results => results.violations);
}

/**
 * Focus management utilities
 */
export const focusUtils = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container: Element): Element[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]',
      'summary',
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  },

  /**
   * Trap focus within a container
   */
  trapFocus(container: Element): () => void {
    const focusableElements = this.getFocusableElements(container);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },

  /**
   * Restore focus to previously focused element
   */
  restoreFocus(previouslyFocusedElement: Element | null): void {
    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElement.focus();
    }
  },
};