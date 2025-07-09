/**
 * Type definitions for accessibility testing utilities
 */

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    target: string[];
    html: string;
    failureSummary: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
  }>;
}

export interface AccessibilityTestResult {
  violations: AccessibilityViolation[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
  testEngine: {
    name: string;
    version: string;
  };
  testRunner: {
    name: string;
  };
  testEnvironment: {
    userAgent: string;
    windowWidth: number;
    windowHeight: number;
  };
  timestamp: string;
  url: string;
}

export interface KeyboardNavigationResult {
  success: boolean;
  results: Array<{
    expectedElement: Element;
    actualElement: Element | null;
    matches: boolean;
    index: number;
    direction?: 'forward' | 'backward';
  }>;
  focusableElements: Element[];
}

export interface AriaAttributeTest {
  element: Element;
  index: number;
  hasAccessibleName: boolean;
  hasAriaLabel: boolean;
  hasAriaLabelledBy: boolean;
  hasAriaDescribedBy: boolean;
  hasTextContent: boolean;
  hasAltText: boolean;
  hasTitle: boolean;
  tagName: string;
}

export interface HeadingTest {
  element: Element;
  level: number;
  previousLevel: number;
  isValid: boolean;
  textContent: string | undefined;
}

export interface FormElementTest {
  element: Element;
  index: number;
  hasProperLabel: boolean;
  hasLabel: boolean;
  hasAriaLabel: boolean;
  hasAriaLabelledBy: boolean;
  hasImplicitLabel: boolean;
  id: string;
  tagName: string;
}

export interface AriaAttributesResult {
  interactiveElements: AriaAttributeTest[];
  headings: HeadingTest[];
  formElements: FormElementTest[];
  success: boolean;
}

export interface ScreenReaderNavigationResult {
  headingNavigation: Array<{
    element: Element;
    level: number;
    text: string | undefined;
    focused: boolean;
  }>;
  landmarkNavigation: Array<{
    element: Element;
    role: string;
    text: string;
    focused: boolean;
  }>;
  formNavigation: Array<{
    element: Element;
    type: string;
    label: string | undefined;
    focused: boolean;
  }>;
  success: boolean;
}

export interface FocusManagementResult {
  success: boolean;
  initialFocus: boolean;
  wrapAroundForward: boolean;
  wrapAroundBackward: boolean;
  focusableElements: Element[];
}

export interface ColorContrastResult {
  violations: AccessibilityViolation[];
  passes: any[];
  success: boolean;
}

export interface CompleteAccessibilityTestResult {
  axeResults: AccessibilityTestResult;
  keyboardNavigation: KeyboardNavigationResult;
  ariaAttributes: AriaAttributesResult;
  screenReaderNavigation: ScreenReaderNavigationResult;
  focusManagement: FocusManagementResult;
  colorContrast: ColorContrastResult | null;
  overall: {
    success: boolean;
    violations: AccessibilityViolation[];
    totalTests: number;
  };
}

export interface AccessibilityTestOptions {
  rules?: Record<string, any>;
  exclude?: string[];
  timeout?: number;
  includeColorContrast?: boolean;
}

export interface ScreenReaderTestScenario {
  name: string;
  description: string;
  steps: Array<{
    action: 'navigate' | 'activate' | 'focus' | 'read';
    target: string;
    expectedAnnouncement?: string;
    expectedFocus?: string;
  }>;
}

export interface AccessibilityTestReport {
  component: string;
  testDate: string;
  results: CompleteAccessibilityTestResult;
  scenarios: ScreenReaderTestScenario[];
  recommendations: string[];
  wcagLevel: 'A' | 'AA' | 'AAA';
  passed: boolean;
}

// Jest type extensions
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
      toBeAccessible(): R;
      toHaveValidAriaAttributes(): R;
      toSupportKeyboardNavigation(): R;
      toSupportScreenReader(): R;
    }
  }
}

// Common accessibility selectors
export const ACCESSIBILITY_SELECTORS = {
  INTERACTIVE_ELEMENTS: 'button, input, select, textarea, a[href], [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])',
  FOCUSABLE_ELEMENTS: 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"]), [contenteditable], summary',
  HEADINGS: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
  LANDMARKS: 'main, nav, aside, header, footer, section, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]',
  FORM_ELEMENTS: 'input, select, textarea, button, fieldset, legend',
  ARIA_LIVE: '[aria-live], [aria-atomic], [aria-relevant]',
  SKIP_LINKS: '[href="#main"], [href="#content"], .skip-link',
} as const;

// WCAG 2.1 AA success criteria
export const WCAG_SUCCESS_CRITERIA = {
  // Level A
  'non-text-content': '1.1.1',
  'audio-only-video-only': '1.2.1',
  'captions-prerecorded': '1.2.2',
  'audio-description-media-alternative': '1.2.3',
  'info-and-relationships': '1.3.1',
  'meaningful-sequence': '1.3.2',
  'sensory-characteristics': '1.3.3',
  'use-of-color': '1.4.1',
  'audio-control': '1.4.2',
  'keyboard': '2.1.1',
  'no-keyboard-trap': '2.1.2',
  'timing-adjustable': '2.2.1',
  'pause-stop-hide': '2.2.2',
  'three-flashes-or-below': '2.3.1',
  'bypass-blocks': '2.4.1',
  'page-titled': '2.4.2',
  'focus-order': '2.4.3',
  'link-purpose-in-context': '2.4.4',
  'language-of-page': '3.1.1',
  'on-focus': '3.2.1',
  'on-input': '3.2.2',
  'error-identification': '3.3.1',
  'labels-or-instructions': '3.3.2',
  'parsing': '4.1.1',
  'name-role-value': '4.1.2',
  
  // Level AA
  'captions-live': '1.2.4',
  'audio-description-prerecorded': '1.2.5',
  'orientation': '1.3.4',
  'identify-input-purpose': '1.3.5',
  'contrast-minimum': '1.4.3',
  'resize-text': '1.4.4',
  'images-of-text': '1.4.5',
  'reflow': '1.4.10',
  'non-text-contrast': '1.4.11',
  'text-spacing': '1.4.12',
  'content-on-hover-or-focus': '1.4.13',
  'character-key-shortcuts': '2.1.4',
  'pointer-gestures': '2.5.1',
  'pointer-cancellation': '2.5.2',
  'label-in-name': '2.5.3',
  'motion-actuation': '2.5.4',
  'target-size': '2.5.5',
  'concurrent-input-mechanisms': '2.5.6',
  'multiple-ways': '2.4.5',
  'headings-and-labels': '2.4.6',
  'focus-visible': '2.4.7',
  'language-of-parts': '3.1.2',
  'consistent-navigation': '3.2.3',
  'consistent-identification': '3.2.4',
  'error-suggestion': '3.3.3',
  'error-prevention-legal': '3.3.4',
  'status-messages': '4.1.3',
} as const;

export type WCAGCriteria = keyof typeof WCAG_SUCCESS_CRITERIA;