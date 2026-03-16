

## Plan: Fix engine integration on input pages

Three files need modification. Each replaces backend-hitting hooks with local `computeEngine()` using explicit `EngineInputs`.

### 1. `src/pages/FoncierePage.tsx`

**Line 1**: Add `useMemo` to import (`useState` → `useState, useMemo`)
**Line 22**: Replace `import { useEngine } from "@/hooks/useEngine"` with:
```ts
import { computeEngine } from "@/engine/engine";
import type { EngineInputs } from "@/engine/engineTypes";
```
**Lines 33-35**: Replace with explicit `EngineInputs` construction + `computeEngine`:
```ts
const engineInputs = useMemo<EngineInputs>(() => ({
  projet: state.projet, build: state.build, financement: state.financement,
  exploitation: state.exploitation, fonciere: state.fonciere,
  loyerDynamique: state.loyerDynamique, gouvernance: state.gouvernance,
  fiscalite: state.fiscalite,
}), [state]);
const engine = useMemo(() => computeEngine(engineInputs), [engineInputs]);
const sci = engine.fonciere;
const loyerMensuel = engine.loyerDynamique.loyerCalcule;
```

### 2. `src/pages/ExploitationPage.tsx`

**Line 30**: Replace `import { useEngineWithOverrides } from "@/hooks/useEngine"` with:
```ts
import { computeEngine } from "@/engine/engine";
import type { EngineInputs } from "@/engine/engineTypes";
```
**Line 332**: Replace `const engineOutputs = useEngineWithOverrides({ exploitation: form })` with:
```ts
const engineOutputs = useMemo(() => computeEngine({
  projet: state.projet, build: state.build, financement: state.financement,
  exploitation: form, fonciere: state.fonciere,
  loyerDynamique: state.loyerDynamique, gouvernance: state.gouvernance,
  fiscalite: state.fiscalite,
}), [state, form]);
```
(`useMemo` already imported on line 1)

### 3. `src/pages/LoyerDynamiquePage.tsx`

**Line 2**: Remove `import { useQuery } from "@tanstack/react-query"`
**Line 16**: Remove `import { fetchEngine } from "@/hooks/useEngine"`
**Lines 15, 17**: Keep `computeEngine` and `EngineInputs` imports (already present)
**Lines 45-57**: Replace `useMemo` + `useQuery` block with:
```ts
const engineOutputs = useMemo(() => computeEngine({
  projet: state.projet, build: state.build, financement: state.financement,
  exploitation: state.exploitation, fonciere: state.fonciere,
  loyerDynamique: { rentPlan: phases }, gouvernance: state.gouvernance,
  fiscalite: state.fiscalite,
}), [state, phases]);
const computed = engineOutputs.loyerDynamique;
```

### Summary

| File | Remove | Add |
|---|---|---|
| FoncierePage | `useEngine` hook | `computeEngine` + explicit `EngineInputs` |
| ExploitationPage | `useEngineWithOverrides` hook | `computeEngine` + explicit `EngineInputs` with `exploitation: form` |
| LoyerDynamiquePage | `useQuery`, `fetchEngine` | `computeEngine` + explicit `EngineInputs` with `loyerDynamique: { rentPlan: phases }` |

No other files change. All three pages become purely local computation with no network calls.

