

## Audit Report: `computeEngine()` Migration

### 1. Old hooks usage in pages: **CLEAN**

No `.tsx` page file imports from `@/hooks/useEngine`. The three input pages (FoncierePage, ExploitationPage, LoyerDynamiquePage) all use `computeEngine` directly.

### 2. `computeEngine(state)` (direct state pass): **CLEAN**

No occurrence found. All three pages construct explicit `EngineInputs` objects with individual fields.

### 3. Page-by-page verification

| Page | Pattern | Status |
|---|---|---|
| `FoncierePage.tsx` | `useMemo` → explicit `EngineInputs` → `computeEngine(engineInputs)` | Correct |
| `ExploitationPage.tsx` | `useMemo` → explicit fields with `exploitation: form` override | Correct |
| `LoyerDynamiquePage.tsx` | `useMemo` → explicit fields with `loyerDynamique: { rentPlan: phases }` | Correct |

### 4. Imports: **CLEAN**

All three pages import `computeEngine` from `@/engine/engine` and `EngineInputs` from `@/engine/engineTypes`.

### 5. Remaining reference: `src/hooks/useEngine.ts`

This file still exists and exports `useEngine`, `useEngineWithOverrides`, `useEngineWithScenario`, and `fetchEngine`. However:

- **No page imports from it** — confirmed by search.
- `useEngineWithScenario` and `fetchEngine` are still needed for output/projection pages (future integration). The engine inspector components (`src/components/engine/`) may also reference it.
- **No action required now.** This file is the hook layer for output pages and should remain available.

### 6. Summary

| Item | Result |
|---|---|
| Files modified (previous step) | `FoncierePage.tsx`, `ExploitationPage.tsx`, `LoyerDynamiquePage.tsx` |
| Files verified clean | All `.tsx` pages — no stale imports from `useEngine` |
| `computeEngine(state)` violations | None |
| Explicit `EngineInputs` contract | Respected in all 3 input pages |
| `useEngine.ts` hook file | Retained — needed for future output pages |

**Migration is complete.** All input pages call `computeEngine()` with a strict `EngineInputs` object. No backend-hitting hooks remain on configuration pages.

