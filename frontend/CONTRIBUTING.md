# Contributing to DataTourisme Frontend

Thank you for your interest in contributing to DataTourisme! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Contribution Workflow](#-contribution-workflow)
- [Code Style](#-code-style)
- [Testing Guidelines](#-testing-guidelines)
- [Component Guidelines](#-component-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Release Process](#-release-process)
- [Getting Help](#-getting-help)

## 📜 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **pnpm**: 8.x or higher
- **Git**: Latest version
- **VS Code**: Recommended editor with extensions

### Required VS Code Extensions

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "streetsidesoftware.code-spell-checker",
    "ms-playwright.playwright",
    "orta.vscode-jest"
  ]
}
```

## 💻 Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/datatourisme-frontend.git
cd datatourisme-frontend

# Add upstream remote
git remote add upstream https://github.com/datatourisme/frontend.git
```

### 2. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Verify installation
pnpm --version
node --version
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
# Add your API keys, database URLs, etc.
```

### 4. Verify Setup

```bash
# Run tests
pnpm test

# Start development server
pnpm dev

# Build project
pnpm build
```

## 🔄 Contribution Workflow

### 1. Choose an Issue

- Browse [open issues](https://github.com/datatourisme/frontend/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Changes

Follow our [development guidelines](#-code-style) and make your changes.

### 4. Test Your Changes

```bash
# Run all tests
pnpm test

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Test build
pnpm build
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add new search filter component"

# Push to your fork
git push origin feature/your-feature-name
```

### 6. Submit Pull Request

- Open a pull request from your fork to the main repository
- Fill out the PR template completely
- Link any related issues
- Wait for review and address feedback

## 🎨 Code Style

### TypeScript Guidelines

#### Type Definitions
```typescript
// ✅ Good: Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// ✅ Good: Use types for unions and computed types
type UserRole = 'admin' | 'user';
type UserWithRole = User & { role: UserRole };

// ❌ Bad: Don't use any
const user: any = getUserData();

// ✅ Good: Use specific types
const user: User = getUserData();
```

#### Function Components
```typescript
// ✅ Good: Use function declarations with proper typing
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({ variant = 'primary', size = 'md', children, onClick }: ButtonProps) {
  return (
    <button 
      className={cn(buttonVariants({ variant, size }))}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ✅ Good: Export with proper documentation
export { Button };
export type { ButtonProps };
```

### React Guidelines

#### Component Structure
```typescript
// ✅ Good component structure
'use client'; // Only when needed

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  // Props interface
}

function Component({ prop1, prop2 }: ComponentProps) {
  // 1. State declarations
  const [state, setState] = useState<string>('');
  
  // 2. Effect hooks
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 4. Render logic
  return (
    <div className="component-styles">
      {/* JSX */}
    </div>
  );
}

export { Component };
```

#### Hooks Usage
```typescript
// ✅ Good: Custom hooks with proper typing
function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true);
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, [userId]);
  
  return { user, loading, error };
}
```

### CSS/Styling Guidelines

#### Tailwind CSS
```typescript
// ✅ Good: Use Tailwind utilities
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
  <Button variant="primary" size="sm">Action</Button>
</div>

// ✅ Good: Use cn() for conditional classes
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)}>
  Content
</div>

// ❌ Bad: Don't use arbitrary values excessively
<div className="w-[347px] h-[123px] bg-[#ff0000]">
  Content
</div>
```

#### Component Variants
```typescript
// ✅ Good: Use CVA for variant management
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  // Additional props
}
```

### File Organization

```
src/
├── components/
│   ├── ui/                 # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── index.ts
│   ├── forms/             # Form components
│   ├── layout/            # Layout components
│   └── pages/             # Page-specific components
├── lib/
│   ├── utils.ts           # Utility functions
│   ├── validations.ts     # Zod schemas
│   └── constants.ts       # Constants
├── hooks/
│   ├── use-auth.ts        # Authentication hook
│   └── use-api.ts         # API hooks
├── types/
│   ├── user.ts            # User types
│   └── api.ts             # API types
└── styles/
    └── globals.css        # Global styles
```

## 🧪 Testing Guidelines

### Unit Tests

#### Component Testing
```typescript
// ✅ Good: Test user interactions
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

#### Hook Testing
```typescript
// ✅ Good: Test custom hooks
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter(0));
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
});
```

### Integration Tests

```typescript
// ✅ Good: Test complete user flows
import { test, expect } from '@playwright/test';

test('user can search for destinations', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('[data-testid="search-input"]', 'Paris');
  await page.click('[data-testid="search-button"]');
  
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  await expect(page.locator('[data-testid="search-result-item"]')).toHaveCount(5);
});
```

### Accessibility Tests

```typescript
// ✅ Good: Test accessibility
import { axe } from 'jest-axe';

describe('Component Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Component />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });
});
```

## 🧩 Component Guidelines

### Component Creation Checklist

- [ ] Component follows TypeScript best practices
- [ ] Props are properly typed with interfaces
- [ ] Component is accessible (WCAG 2.1 AA)
- [ ] Component has proper test coverage
- [ ] Component has Storybook story
- [ ] Component follows design system guidelines
- [ ] Component is responsive
- [ ] Component supports dark mode (if applicable)

### Component Structure

```typescript
// ComponentName.tsx
'use client'; // Only if needed

import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 1. Variant definitions
const componentVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'default-classes',
        // ... other variants
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// 2. Props interface
interface ComponentProps extends VariantProps<typeof componentVariants> {
  className?: string;
  // ... other props
}

// 3. Component implementation
const Component = forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

Component.displayName = 'Component';

// 4. Export
export { Component, componentVariants };
export type { ComponentProps };
```

### Storybook Stories

```typescript
// Component.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Component } from './Component';

const meta: Meta<typeof Component> = {
  title: 'Components/Component',
  component: Component,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'variant1', 'variant2'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  },
};

export const Interactive: Story = {
  args: {
    // Interactive props
  },
  play: async ({ canvasElement }) => {
    // Interaction testing
  },
};
```

## 📝 Pull Request Process

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Accessibility tests pass
- [ ] Visual tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] Bundle size impact checked

## Screenshots
Include screenshots for UI changes

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Code Review**: Team members review code quality
3. **Design Review**: Design team reviews UI changes
4. **Accessibility Review**: A11y team reviews accessibility
5. **Final Approval**: Maintainers approve and merge

### Review Criteria

- Code quality and best practices
- Test coverage and quality
- Accessibility compliance
- Performance impact
- Documentation completeness
- Design consistency

## 📦 Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Create Release Branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update Version**
   ```bash
   pnpm changeset
   pnpm changeset version
   ```

3. **Update Changelog**
   ```bash
   # Update CHANGELOG.md with new features and fixes
   ```

4. **Create Release PR**
   ```bash
   # Create PR with release changes
   ```

5. **Deploy to Production**
   ```bash
   # After PR approval, deploy to production
   ```

## 🤝 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with the team
- **Email**: dev@datatourisme.fr for private inquiries

### Documentation

- **README.md**: Project overview and setup
- **docs/**: Detailed documentation
- **Storybook**: Component documentation
- **Wiki**: Additional guides and tutorials

### Mentorship

New contributors can request mentorship:
- Comment on issues asking for guidance
- Join our Discord for real-time help
- Attend our weekly office hours

## 📚 Additional Resources

### Learning Resources

- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Testing Library Documentation](https://testing-library.com/docs/)

### Tools and Extensions

- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
- [Accessibility Insights](https://chrome.google.com/webstore/detail/accessibility-insights-fo/pbjjkligggfmakdaogkfomddhfmpjeni)

### Code Examples

Check out our [examples repository](https://github.com/datatourisme/examples) for:
- Component patterns
- Testing examples
- Performance optimizations
- Accessibility implementations

---

Thank you for contributing to DataTourisme! 🎉

*This document is updated regularly. Last updated: December 2024*