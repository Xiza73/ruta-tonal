---
name: vitest
description: >
  Vitest testing patterns (v4): config, jsdom/React setup, mocking with vi, async tests,
  mock lifecycle (clear/reset/restore), and React Testing Library with user-event v14.
  Trigger: When writing or configuring Vitest tests — unit, async, mocks, or React component tests.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Writing unit / integration tests in JS/TS with Vitest (v4)
- Configuring `vitest.config.ts` (environment, globals, coverage)
- Mocking modules/functions with `vi`
- Testing React components (RTL + user-event)

## Config — the piece tests need to run

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,            // use describe/it/expect without importing
    environment: 'jsdom',     // DOM for component tests ('node' is the default)
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8' },
  },
});
```

```ts
// vitest.setup.ts — registers matchers like toBeInTheDocument()
import '@testing-library/jest-dom/vitest';
```

- **React/DOM tests need `environment: 'jsdom'`** (or `'happy-dom'`) — without it they fail.
- With `globals: true`, RTL auto-registers cleanup and you can drop the `vitest` imports.
  With `globals: false`, import `cleanup` and call it in `afterEach`.

## Critical Patterns

### Basic & async

```ts
import { describe, it, expect } from 'vitest';

describe('math', () => {
  it('adds', () => expect(1 + 1).toBe(2));
  it('throws on invalid input', () => expect(() => divide(1, 0)).toThrow('Division by zero'));
});

it('resolves data', async () => {
  await expect(fetchData()).resolves.toEqual({ id: 1 });
});
it('rejects on error', async () => {
  await expect(fetchData()).rejects.toThrow('Error');
});
```

### Mocking

```ts
import { vi, expect } from 'vitest';

vi.mock('./api', () => ({                       // module mock (hoisted)
  fetchUser: vi.fn().mockResolvedValue({ id: 1 }),
}));

const cb = vi.fn();
cb('arg');
expect(cb).toHaveBeenCalledWith('arg');
```

### Mock lifecycle — the part people get wrong

```ts
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();    // wipe call history, KEEP implementation
});
```

| Call | Resets calls | Resets implementation | Restores original |
|------|:---:|:---:|:---:|
| `vi.clearAllMocks()` | ✅ | ❌ | ❌ |
| `vi.resetAllMocks()` | ✅ | ✅ (→ empty) | ❌ |
| `vi.restoreAllMocks()` | ✅ | — | ✅ (only `vi.spyOn` spies) |

Or automate in config: `clearMocks: true` / `restoreMocks: true`.

### React (RTL + user-event v14)

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // v14: default import

it('handles click', async () => {
  const onClick = vi.fn();
  const user = userEvent.setup();              // create once, BEFORE render
  render(<Button onClick={onClick}>Click</Button>);
  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

## Commands

```bash
vitest                       # watch mode (default)
vitest run                   # single run (CI)
vitest --ui                  # browser UI
vitest run --coverage        # coverage report
vitest related ./src/foo.ts  # only tests affected by a file
```

## Pitfalls

- **Not awaiting async** — always `await` promises and `user` actions.
- **Stale mocks** — clear/reset between tests (or `clearMocks: true`).
- **Testing implementation** — assert behavior (roles, output), not internals.

## Resources

- Config: https://vitest.dev/config/
- Mocking (`vi`): https://vitest.dev/api/vi
- Testing Library user-event: https://testing-library.com/docs/user-event/intro/
