---
name: simplify
description: Code review and simplification pass. Run after completing any implementation to enforce project standards — function length, duplication, type safety, prop grouping, and error handling. Automatically applied before presenting code to the user.
---

# /simplify — Code Review & Simplification

Run this skill after completing any implementation, **before presenting code to the user**. This is a mandatory quality gate.

## Code Review Standards

Scan every file touched in the current task and flag violations:

### 1. Function Length
- **Rule**: No function longer than 30 lines
- **Why**: Functions over 30 lines are likely doing too much
- **Fix**: Extract logical sections into named helper functions with clear single responsibilities
- If a function is 31–40 lines and genuinely cohesive, note it but allow with justification

### 2. Duplication
- **Rule**: No logic duplicated more than twice
- **Why**: Three copies = a utility waiting to be extracted
- **Fix**: Extract to a shared utility in the appropriate location:
  - Component helpers → `src/lib/utils.ts` or co-located `helpers.ts`
  - API patterns → `src/services/` or `src/lib/`
  - UI patterns → shared component in `src/components/`

### 3. TypeScript Strictness
- **Rule**: Zero `any` types
- **Why**: `any` defeats the purpose of TypeScript and hides bugs
- **Fix**: Replace with the real type, a union, `unknown`, or a generic
- Common offenders to watch for:
  - `catch (error: any)` → use `catch (error: unknown)` and narrow
  - `Record<string, any>` → define a proper interface
  - Function params typed as `any` → trace the actual shape

### 4. Prop Grouping
- **Rule**: Components with more than 3 props should group related props into objects
- **Why**: Long prop lists are hard to read and maintain
- **Fix**: Group into typed objects, e.g.:
  ```tsx
  // Before
  function Card({ title, subtitle, icon, onClick, variant, size }) { ... }

  // After
  interface CardProps {
    content: { title: string; subtitle?: string; icon?: ReactNode };
    appearance?: { variant?: "default" | "outlined"; size?: "sm" | "md" | "lg" };
    onClick?: () => void;
  }
  ```
- Exception: Standard HTML-like props (className, style, children, id) don't count toward the limit

### 5. Async Error Handling
- **Rule**: Every async operation must have error handling
- **Why**: Unhandled rejections crash the app or silently fail
- **Fix**: Ensure one of:
  - `try/catch` wrapping the await
  - `.catch()` chained on the promise
  - Error boundary for component-level async (React)
  - Intentional fire-and-forget with `.catch(() => {})` commented as such
- Pay special attention to:
  - `fetch` / API calls
  - Database queries (Prisma)
  - File system operations
  - Third-party SDK calls

## Review Process

1. **List** every file modified in this task
2. **Scan** each file against all 5 rules above
3. **Fix** violations inline — don't just flag them, resolve them
4. **Report** a brief summary of what was simplified:
   - Number of functions shortened
   - Utilities extracted
   - `any` types eliminated
   - Props restructured
   - Error handling added
5. If zero violations found, confirm: "✓ Clean — all 5 standards pass"

## When to Run

- Automatically before presenting any implementation to the user
- On request via `/simplify`
- During refactoring tasks
- Before committing feature branches
