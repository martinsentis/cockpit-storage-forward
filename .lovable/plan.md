

## Plan : Fix build error + localStorage persistence

### 1. Fix `src/types/project.ts` (line 64-70)
The `GouvernanceData` interface has a malformed closing — extra `};` creating a syntax error. Fix indentation of `rentConstraints` and remove the extra closing brace:
```ts
  rentConstraints: {
    mode: RentMode;
    monthlyRent: number;
  };
}
```
(remove the extra `};` at line 69)

### 2. Modify `src/contexts/ProjectContext.tsx`
- Add `useEffect` import
- Define `STORAGE_KEY = "pilotagebox_project_state"`
- Initialize `state` and `validated` from localStorage (with fallback to defaults)
- Add a `useEffect` that saves `{ state, validated }` to localStorage on every change
- No new logic, no structural changes

