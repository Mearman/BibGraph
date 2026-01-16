# max-file-length

Enforce a maximum file length to improve code maintainability and reduce cognitive load.

## Rationale

Large files are difficult to navigate, understand, and maintain. This rule encourages:

- **Modular design**: Smaller files with focused, single responsibilities
- **Easier code review**: Reviewers can process smaller chunks more effectively
- **Reduced merge conflicts**: Multiple developers are less likely to edit the same large file simultaneously
- **Lower cognitive load**: Smaller files are easier to comprehend and remember
- **Better testability**: Smaller modules are easier to unit test

This rule aligns with BibGraph's [DRY principle](../../.specify/memory/constitution.md#xv-dry-code--configuration-non-negotiable) - enforcing modular architecture prevents code duplication and maintenance burden.

## Options

```typescript
{
  type: "number",
  minimum: 1,
  default: 750
}
```

- **`max`** (default: `750`): Maximum number of lines allowed in a file.

## Exclusions

Certain file types are excluded from this rule because they legitimately require more lines:

### Theme Files (`*.theme.ts`)

Theme definitions (e.g., Mantine theme configurations) are inherently complex due to:
- Color system definitions
- Typography scales
- Component theme overrides
- Spacing and layout tokens

**Example**: `apps/web/src/styles/shadcn-mantine-theme.ts` (1,829 lines)

### Generated Files (`*.gen.ts`, `*.generated.ts`)

Auto-generated files are not human-maintained and should not be refactored:
- Router trees (`routeTree.gen.ts`)
- API client code
- Schema definitions

**Example**: `apps/web/src/routeTree.gen.ts` (1,413 lines)

### Test Files (`*.test.ts`, `*.spec.ts`)

Test files have a higher limit (1,000 lines) and use warning level instead of error:
- Test fixtures and setup can be verbose
- Parameterized tests generate many test cases
- Mock objects and test data add lines

If a test file exceeds 1,000 lines, consider splitting by:
- Feature or component under test
- Test type (unit vs integration vs E2E)
- Test suite (smoke vs regression vs performance)

## Error Message

```
File too long ({{current}} lines). Maximum allowed is {{max}} lines ({{percentage}}% over limit).
Consider refactoring into smaller modules or add to excludePatterns if justified.
```

The error message shows:
- **Current line count**: How many lines the file has
- **Maximum allowed**: The configured limit
- **Percentage over**: How much the file exceeds the limit (rounded to nearest integer)

## Refactoring Guidance

When a file exceeds the limit, consider these refactoring strategies:

### 1. Extract Cohesive Functionality

Group related functions/classes into separate modules:

```typescript
// Before (800 lines)
// analytics.ts
export const computeRevenue = () => { /* 100 lines */ };
export const computeExpenses = () => { /* 100 lines */ };
export const computeProfit = () => { /* 100 lines */ };
export const computeGrowth = () => { /* 100 lines */ };
export const computeChurn = () => { /* 100 lines */ };
export const computeLTV = () => { /* 100 lines */ };
export const computeCAC = () => { /* 100 lines */ };
// ... more functions

// After
// analytics/
//   index.ts - barrel file
//   revenue.ts
//   expenses.ts
//   profit.ts
//   growth.ts
//   churn.ts
//   ltv.ts
//   cac.ts
```

### 2. Use Barrel Files for Clean Re-exports

Maintain backward compatibility by re-exporting from an index file:

```typescript
// analytics/index.ts
export { computeRevenue } from './revenue';
export { computeExpenses } from './expenses';
export { computeProfit } from './profit';
// ... etc
```

Importers can still use:
```typescript
import { computeRevenue, computeExpenses } from './analytics';
```

### 3. Separate Concerns

Split files that mix multiple concerns:

```typescript
// Before (700 lines)
// useData.ts
import { useQuery } from '@tanstack/react-query';

export const useUsers = () => {
  // Query logic (100 lines)
  // Caching logic (100 lines)
  // Error handling (100 lines)
  // UI state (100 lines)
  // Filters (100 lines)
  // Pagination (100 lines)
};

// After
// useData/
//   use-users-query.ts     - Query logic
//   use-users-cache.ts     - Caching logic
//   use-users-filters.ts   - Filters & pagination
```

### 4. Extract Constants and Data

Move large data structures to separate files:

```typescript
// Before (500 lines, 400 lines of constants)
// theme.ts
export const BUTTON_COLORS = { /* 200 lines */ };
export const INPUT_COLORS = { /* 200 lines */ };
export const theme = { /* 100 lines */ };

// After
// theme/colors.ts
export const BUTTON_COLORS = { /* 200 lines */ };
export const INPUT_COLORS = { /* 200 lines */ };

// theme/index.ts
export { BUTTON_COLORS, INPUT_COLORS } from './colors';
export const theme = { /* 100 lines */ };
```

### 5. Split Tests by Feature

Organize large test files:

```typescript
// Before (1,500 lines)
// analytics.test.ts
describe('Analytics', () => {
  describe('Revenue', () => { /* 300 lines */ });
  describe('Expenses', () => { /* 300 lines */ });
  describe('Profit', () => { /* 300 lines */ });
  describe('Growth', () => { /* 300 lines */ });
  describe('Churn', () => { /* 300 lines */ });
});

// After
// analytics/
//   revenue.test.ts
//   expenses.test.ts
//   profit.test.ts
//   growth.test.ts
//   churn.test.ts
```

## Examples

### ❌ Incorrect - File Too Long

```typescript
// user-service.ts (801 lines)

import { db } from './db';

export const getUsers = async () => { /* ... */ };
export const getUserById = async () => { /* ... */ };
export const createUser = async () => { /* ... */ };
export const updateUser = async () => { /* ... */ };
export const deleteUser = async () => { /* ... */ };
// ... 40 more functions (40 lines each)
```

**Error**:
```
user-service.ts
  1:1  error  File too long (801 lines). Maximum allowed is 750 lines (7% over limit)  custom/max-file-length
```

### ✅ Correct - Refactored Into Modules

```typescript
// user-service/index.ts (20 lines)
export { getUsers, getUserById } from './queries';
export { createUser, updateUser, deleteUser } from './mutations';
export { validateUser } from './validation';
export { hashPassword, verifyPassword } from './auth';

// user-service/queries.ts (200 lines)
import { db } from './db';

export const getUsers = async () => { /* ... */ };
export const getUserById = async () => { /* ... */ };

// user-service/mutations.ts (250 lines)
import { db } from './db';

export const createUser = async () => { /* ... */ };
export const updateUser = async () => { /* ... */ };
export const deleteUser = async () => { /* ... */ };

// user-service/validation.ts (150 lines)
export const validateUser = (user: User) => { /* ... */ };

// user-service/auth.ts (150 lines)
export const hashPassword = (pw: string) => { /* ... */ };
export const verifyPassword = (pw: string) => { /* ... */ };
```

## Configuration

This rule is configured in `eslint.config.base.ts`:

```typescript
// Default configuration for most files
"custom/max-file-length": ["error", { max: 750 }],

// Test files - higher limit, warning only
{
  files: ["**/*.test.ts", "**/*.test.tsx"],
  rules: {
    "custom/max-file-length": ["warn", { max: 1000 }],
  },
},

// Theme and generated files - excluded
{
  files: ["**/*.theme.ts", "**/*.gen.ts", "**/*.generated.ts"],
  rules: {
    "custom/max-file-length": "off",
  },
},
```

## Related Rules

- [no-deprecated](./no-deprecated.md) - Prevents use of deprecated APIs
- [no-duplicate-reexports](./no-duplicate-reexports.md) - Prevents duplicate re-exports in barrel files
- [no-reexport-from-non-barrel](./no-reexport-from-non-barrel.md) - Enforces re-exports only from barrel files

## See Also

- [BibGraph Constitution - Principle XV: DRY Code & Configuration](../../.specify/memory/constitution.md#xv-dry-code--configuration-non-negotiable)
- [BibGraph Constitution - Quality Gates](../../.specify/memory/constitution.md#quality-gates)
