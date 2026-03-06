

## Diagnostic

Two root causes identified in the `onFinalize` handler (`ExploitationPage.tsx`, lines 1137-1205):

### Problem 1 — Crédits SCI invisibles dans Foncière
The wizard puts **all** debts into `state.financement.debts`, regardless of entity. But `FoncierePage.tsx` reads exclusively from `state.financement.sciDebts` (line 151/164). When a phase targets entity `__fonciere__`, the created debt goes to the wrong array.

**Fix**: In `onFinalize`, split debt creation: debts with `entityId === "__fonciere__"` go into `sciDebts`, others go into `debts`.

### Problem 2 — Actifs immobilisés absents dans Foncière
The wizard stores CAPEX data as `capexEstimate` on the phase object (surface cost breakdown), but **never creates entries** in `state.build.capexEvents`. `FoncierePage.tsx` line 38 reads assets from `state.build.capexEvents[*].assets` — so the section is always empty after wizard finalization.

**Fix**: In `onFinalize`, when the phase targets `__fonciere__`, create a `CapexEvent` in `state.build.capexEvents` with budget lines derived from the phase's `capexEstimate` and corresponding amortizable assets.

### Implementation — `src/pages/ExploitationPage.tsx`

**Debt routing (lines 1142-1169)**:
```
// Split by entity
const foncDebts = newDebts.filter(d => d.entityId === "__fonciere__");
const exploDebts = newDebts.filter(d => d.entityId !== "__fonciere__");
if (foncDebts.length > 0) updateSection("financement", { sciDebts: [...state.financement.sciDebts, ...foncDebts] });
if (exploDebts.length > 0) updateSection("financement", { debts: [...state.financement.debts, ...exploDebts] });
```

**CAPEX/Asset creation (new block after debt handling)**:
When entity is `__fonciere__`, create a `CapexEvent` from `capexEstimate`:
- Map non-zero estimate fields to budget lines (Équipement productif → EQUIPEMENTS_PRODUCTIFS, Aménagement → VRD, Honoraires → HONORAIRES, Divers → DIVERS)
- Create matching amortizable assets for eligible categories (EQUIPEMENTS_PRODUCTIFS, VRD)
- Set `startMonth` from phase data
- Push event into `state.build.capexEvents` via `updateSection("build", ...)`

### Files modified

| File | Change |
|---|---|
| `src/pages/ExploitationPage.tsx` | Route SCI debts to `sciDebts`; generate `CapexEvent` + assets from `capexEstimate` |

