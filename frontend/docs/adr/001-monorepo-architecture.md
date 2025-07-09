# ADR-001: Monorepo Architecture with Turbo and pnpm

## Status
Accepted

## Context
We need to build an enterprise-grade React/Next.js application for DataTourisme that can scale with multiple packages, shared libraries, and potentially multiple applications. The project requires:

- Code sharing between packages
- Consistent development workflow
- Efficient dependency management
- Fast build and test cycles
- Clear separation of concerns

## Decision
We will use a **Turbo + pnpm monorepo architecture** with the following structure:

```
frontend/
├── apps/
│   └── web/              # Next.js main application
├── packages/
│   ├── ui/               # Shared UI component library
│   ├── types/            # TypeScript type definitions
│   └── eslint-config/    # Shared ESLint configuration
└── tooling/
    └── typescript/       # Shared TypeScript configurations
```

## Rationale

### Turbo Benefits
- **Incremental builds**: Only rebuilds what changed
- **Parallel execution**: Runs tasks across packages simultaneously
- **Caching**: Local and remote caching for faster CI/CD
- **Pipeline definition**: Clear dependency graphs between tasks

### pnpm Benefits
- **Disk efficiency**: Single storage with symlinks
- **Faster installs**: Parallel downloading and linking
- **Strict dependency resolution**: Prevents phantom dependencies
- **Workspace support**: Native monorepo support

### Alternative Considered
- **Lerna**: Deprecated and less performant than Turbo
- **Yarn Workspaces**: Less efficient than pnpm
- **Rush**: More complex setup for our needs
- **Nx**: Overkill for current project scope

## Implementation

### Package.json Workspace Configuration
```json
{
  "workspaces": ["apps/*", "packages/*", "tooling/*"],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test"
  }
}
```

### Turbo Pipeline Configuration
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Consequences

### Positive
- ✅ Fast development cycles with hot reloading
- ✅ Shared code reuse without duplication
- ✅ Consistent tooling across packages
- ✅ Efficient CI/CD with incremental builds
- ✅ Clear dependency management

### Negative
- ❌ Learning curve for developers new to monorepos
- ❌ Initial setup complexity
- ❌ Potential for package interdependency issues

### Neutral
- 🔄 Requires discipline in package boundaries
- 🔄 Need clear conventions for imports and exports

## Monitoring
- Build times tracked in CI/CD
- Developer experience surveys
- Package coupling metrics
- Cache hit rates

## References
- [Turbo Documentation](https://turbo.build/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://nx.dev/concepts/more-concepts/why-monorepos)