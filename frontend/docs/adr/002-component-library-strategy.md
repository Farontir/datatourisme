# ADR-002: Component Library Strategy with Radix UI and CVA

## Status
Accepted

## Context
We need a robust, accessible, and maintainable component library for the DataTourisme application. Requirements include:

- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Design system implementation
- **Developer Experience**: Easy to use and extend
- **Performance**: Minimal bundle size impact
- **Flexibility**: Support for customization

## Decision
We will build our component library using **Radix UI primitives** with **Class Variance Authority (CVA)** for styling, combined with **Tailwind CSS** for utilities.

## Architecture

### Base Layer: Radix UI Primitives
- Unstyled, accessible components
- Focus management and keyboard navigation
- ARIA attributes and screen reader support
- Composable component patterns

### Styling Layer: CVA + Tailwind
- Type-safe variant definitions
- Consistent design tokens
- Responsive utilities
- Dark mode support

### Component Structure
```typescript
// Example: Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Rationale

### Radix UI Benefits
- **Accessibility**: Built-in WCAG compliance
- **Headless**: Complete styling control
- **Composable**: Flexible component patterns
- **Maintained**: Active development and support
- **TypeScript**: Full type safety

### CVA Benefits
- **Type Safety**: Compile-time variant checking
- **Performance**: No runtime style generation
- **DX**: Excellent IntelliSense support
- **Consistency**: Enforced design system
- **Flexibility**: Easy variant composition

### Alternative Considered
- **Chakra UI**: Less customization flexibility
- **Mantine**: Heavier bundle size
- **Ant Design**: Not design-system agnostic
- **Material-UI**: Harder to customize deeply
- **Styled Components**: Runtime performance cost

## Implementation Strategy

### 1. Design Tokens
```css
:root {
  --color-primary: 220 14% 16%;
  --color-secondary: 220 13% 91%;
  --color-accent: 220 14% 96%;
  --color-muted: 220 13% 91%;
  --radius: 0.5rem;
}
```

### 2. Component Patterns
```typescript
// Compound component pattern
export const Card = ({ className, ...props }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
);

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
```

### 3. Accessibility First
- All interactive elements have proper ARIA labels
- Focus management for complex components
- Keyboard navigation support
- Screen reader announcements

### 4. Testing Strategy
- Visual regression tests with Chromatic
- Accessibility tests with axe-core
- Unit tests for component logic
- Integration tests for user flows

## Package Structure
```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   └── ...
│   ├── hooks/
│   ├── utils/
│   └── index.ts
├── stories/
└── package.json
```

## Consequences

### Positive
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Type-safe component variants
- ✅ Excellent developer experience
- ✅ Minimal runtime overhead
- ✅ Easy customization and theming
- ✅ Consistent design system

### Negative
- ❌ Learning curve for Radix UI patterns
- ❌ Initial setup complexity for compound components
- ❌ Potential over-engineering for simple components

### Neutral
- 🔄 Requires design system discipline
- 🔄 Need clear component documentation

## Success Metrics
- Lighthouse accessibility score ≥ 95
- Component reuse rate > 80%
- Developer satisfaction scores
- Design consistency audits
- Bundle size impact < 50kb

## Migration Strategy
1. **Phase 1**: Core components (Button, Input, Card)
2. **Phase 2**: Layout components (Header, Sidebar, Container)
3. **Phase 3**: Complex components (Forms, Data tables, Modals)
4. **Phase 4**: Domain-specific components (Search, Maps, Filters)

## References
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Class Variance Authority](https://cva.style/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Component Design Patterns](https://www.patterns.dev/posts/compound-pattern)