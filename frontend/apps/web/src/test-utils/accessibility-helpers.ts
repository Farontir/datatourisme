import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

/**
 * Accessibility test utilities for comprehensive A11y testing
 */

export interface AccessibilityTestOptions {
  /**
   * Additional axe rules to run
   */
  rules?: Record<string, any>;
  /**
   * Elements to exclude from testing
   */
  exclude?: string[];
  /**
   * Test timeout in milliseconds
   */
  timeout?: number;
  /**
   * Include color contrast testing
   */
  includeColorContrast?: boolean;
}

/**
 * Run comprehensive accessibility tests on a component
 */
export async function runAccessibilityTests(
  component: React.ReactElement,
  options: AccessibilityTestOptions = {}
) {
  const { rules = {}, exclude = [], timeout = 5000, includeColorContrast = false } = options;
  
  const { container } = render(component);
  
  // Configure axe rules
  const axeConfig = {
    rules: {
      'color-contrast': { enabled: includeColorContrast },
      'wcag2a': { enabled: true },
      'wcag2aa': { enabled: true },
      'wcag21aa': { enabled: true },
      ...rules,
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    exclude: exclude.map(selector => [selector]),
    timeout,
  };
  
  // Run axe accessibility tests
  const results = await axe(container, axeConfig);
  
  return {
    results,
    container,
    violations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
  };
}

/**
 * Test keyboard navigation through focusable elements
 */
export async function testKeyboardNavigation(container: HTMLElement) {
  const user = userEvent.setup();
  
  // Get all focusable elements
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
  
  const focusableElements = container.querySelectorAll(focusableSelectors);
  
  if (focusableElements.length === 0) {
    return {
      success: true,
      message: 'No focusable elements found',
      focusableElements: [],
    };
  }
  
  const results = [];
  
  // Test forward tab navigation
  let currentIndex = 0;
  for (const element of focusableElements) {
    await user.tab();
    const focusedElement = document.activeElement;
    
    results.push({
      expectedElement: element,
      actualElement: focusedElement,
      matches: element === focusedElement,
      index: currentIndex,
    });
    
    currentIndex++;
  }
  
  // Test backward tab navigation (Shift+Tab)
  for (let i = focusableElements.length - 1; i >= 0; i--) {
    await user.tab({ shift: true });
    const focusedElement = document.activeElement;
    const expectedElement = focusableElements[i];
    
    results.push({
      expectedElement,
      actualElement: focusedElement,
      matches: expectedElement === focusedElement,
      index: i,
      direction: 'backward',
    });
  }
  
  return {
    success: results.every(r => r.matches),
    results,
    focusableElements: Array.from(focusableElements),
  };
}

/**
 * Test ARIA attributes and screen reader announcements
 */
export function testAriaAttributes(container: HTMLElement) {
  const ariaTests = [];
  
  // Test for proper ARIA labels
  const interactiveElements = container.querySelectorAll(
    'button, input, select, textarea, a[href], [role="button"], [role="link"]'
  );
  
  interactiveElements.forEach((element, index) => {
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasAriaDescribedBy = element.hasAttribute('aria-describedby');
    const hasTextContent = element.textContent?.trim();
    const hasAltText = element.hasAttribute('alt');
    const hasTitle = element.hasAttribute('title');
    
    const hasAccessibleName = hasAriaLabel || hasAriaLabelledBy || hasTextContent || hasAltText || hasTitle;
    
    ariaTests.push({
      element,
      index,
      hasAccessibleName,
      hasAriaLabel,
      hasAriaLabelledBy,
      hasAriaDescribedBy,
      hasTextContent: !!hasTextContent,
      hasAltText,
      hasTitle,
      tagName: element.tagName.toLowerCase(),
    });
  });
  
  // Test for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingTests = Array.from(headings).map((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const previousHeading = headings[index - 1];
    const previousLevel = previousHeading ? parseInt(previousHeading.tagName.charAt(1)) : 0;
    
    return {
      element: heading,
      level,
      previousLevel,
      isValid: index === 0 || level <= previousLevel + 1,
      textContent: heading.textContent?.trim(),
    };
  });
  
  // Test for proper form labels
  const formElements = container.querySelectorAll('input, select, textarea');
  const formTests = Array.from(formElements).map((element, index) => {
    const hasLabel = container.querySelector(`label[for="${element.id}"]`);
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasImplicitLabel = element.parentElement?.tagName === 'LABEL';
    
    const hasProperLabel = hasLabel || hasAriaLabel || hasAriaLabelledBy || hasImplicitLabel;
    
    return {
      element,
      index,
      hasProperLabel,
      hasLabel: !!hasLabel,
      hasAriaLabel,
      hasAriaLabelledBy,
      hasImplicitLabel,
      id: element.id,
      tagName: element.tagName.toLowerCase(),
    };
  });
  
  return {
    interactiveElements: ariaTests,
    headings: headingTests,
    formElements: formTests,
    success: ariaTests.every(t => t.hasAccessibleName) && 
             headingTests.every(t => t.isValid) && 
             formTests.every(t => t.hasProperLabel),
  };
}

/**
 * Simulate screen reader navigation patterns
 */
export async function simulateScreenReaderNavigation(container: HTMLElement) {
  const user = userEvent.setup();
  
  // Test heading navigation (common screen reader feature)
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingNavigation = [];
  
  for (const heading of headings) {
    // Focus on heading
    if (heading instanceof HTMLElement) {
      heading.focus();
      headingNavigation.push({
        element: heading,
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent?.trim(),
        focused: document.activeElement === heading,
      });
    }
  }
  
  // Test landmark navigation
  const landmarks = container.querySelectorAll(
    'main, nav, aside, header, footer, section, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'
  );
  const landmarkNavigation = [];
  
  for (const landmark of landmarks) {
    if (landmark instanceof HTMLElement) {
      landmark.focus();
      landmarkNavigation.push({
        element: landmark,
        role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
        text: landmark.textContent?.trim().substring(0, 50) + '...',
        focused: document.activeElement === landmark,
      });
    }
  }
  
  // Test form navigation
  const formElements = container.querySelectorAll('input, select, textarea, button');
  const formNavigation = [];
  
  for (const element of formElements) {
    if (element instanceof HTMLElement) {
      element.focus();
      const label = container.querySelector(`label[for="${element.id}"]`);
      const ariaLabel = element.getAttribute('aria-label');
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      
      formNavigation.push({
        element,
        type: element.tagName.toLowerCase(),
        label: label?.textContent?.trim() || ariaLabel || ariaLabelledBy,
        focused: document.activeElement === element,
      });
    }
  }
  
  return {
    headingNavigation,
    landmarkNavigation,
    formNavigation,
    success: headingNavigation.every(h => h.focused) && 
             landmarkNavigation.every(l => l.focused) && 
             formNavigation.every(f => f.focused),
  };
}

/**
 * Test color contrast (when enabled)
 */
export async function testColorContrast(container: HTMLElement) {
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: true },
    },
    tags: ['wcag2aa'],
  });
  
  return {
    violations: results.violations.filter(v => v.id === 'color-contrast'),
    passes: results.passes.filter(p => p.id === 'color-contrast'),
    success: results.violations.filter(v => v.id === 'color-contrast').length === 0,
  };
}

/**
 * Test focus management
 */
export async function testFocusManagement(container: HTMLElement) {
  const user = userEvent.setup();
  
  // Test focus trapping (for modals, dialogs, etc.)
  const focusableElements = container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) {
    return { success: true, message: 'No focusable elements found' };
  }
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  // Test initial focus
  firstElement.focus();
  const initialFocus = document.activeElement === firstElement;
  
  // Test focus wrap-around (if applicable)
  lastElement.focus();
  await user.tab();
  const wrapAroundForward = document.activeElement === firstElement;
  
  firstElement.focus();
  await user.tab({ shift: true });
  const wrapAroundBackward = document.activeElement === lastElement;
  
  return {
    success: initialFocus && wrapAroundForward && wrapAroundBackward,
    initialFocus,
    wrapAroundForward,
    wrapAroundBackward,
    focusableElements: Array.from(focusableElements),
  };
}

/**
 * Complete accessibility test suite
 */
export async function runCompleteAccessibilityTestSuite(
  component: React.ReactElement,
  options: AccessibilityTestOptions = {}
) {
  const { container, results } = await runAccessibilityTests(component, options);
  
  const keyboardNavigation = await testKeyboardNavigation(container);
  const ariaAttributes = testAriaAttributes(container);
  const screenReaderNavigation = await simulateScreenReaderNavigation(container);
  const focusManagement = await testFocusManagement(container);
  
  let colorContrast = null;
  if (options.includeColorContrast) {
    colorContrast = await testColorContrast(container);
  }
  
  return {
    axeResults: results,
    keyboardNavigation,
    ariaAttributes,
    screenReaderNavigation,
    focusManagement,
    colorContrast,
    overall: {
      success: results.violations.length === 0 && 
               keyboardNavigation.success && 
               ariaAttributes.success && 
               screenReaderNavigation.success && 
               focusManagement.success &&
               (colorContrast ? colorContrast.success : true),
      violations: results.violations,
      totalTests: 5 + (colorContrast ? 1 : 0),
    },
  };
}