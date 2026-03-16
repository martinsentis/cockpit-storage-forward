

## Corrected Plan: Request Adapter + Response Adapter

### 1. Request Adapter — `src/engine/mapToProjectionInputs.ts`

**Corrections applied:**

**`reserveAfterCcaFullyRepaid`** → `true` (boolean, not a ratio)

**`rentConstraints` mode translation table:**

| Frontend mode | Backend mode |
|---|---|
| `SCI_AUTONOMY` | `AUTONOMIE_SCI` |
| `DEBT_PAYDOWN` | `DESENDETTEMENT_SCI` |
| `OPTIMIZATION` | `OPTIMISATION_FISCALE` |
| `MIX` | `OPTIMISATION_EBE_EXPLOITATION` |
| `FIXED_AMOUNT` | `FIXE` |

Fallback: `AUTONOMIE_SCI`

All other field mappings remain as previously approved (taxSchedules hardcoded, phases with `phaseId/totalSurface/operationalStartMonth/rampUpStartMonth/rampUpDurationMonths/isActive`, revenueParams from first active phase, debts wrapped in `{debt, state}`, operatingCharges as `SAS_OPEX`, etc.)

---

### 2. Response Adapter — `src/engine/mapFromProjectionResults.ts`

**Problem:** Backend returns `MonthlyResult[]`. Frontend components expect `EngineOutputs` (with `.exploitation`, `.fonciere`, `.loyerDynamique` sub-objects).

**Pages consuming `EngineOutputs` today:**

| Page | Hook | Fields used |
|---|---|---|
| `ExploitationPage` | `useEngineWithOverrides` | `engineOutputs.exploitation.*` (totalCAHT, caServicesHT, phaseMetrics, etc.) |
| `FoncierePage` | `useEngine` | `engine.fonciere.*`, `engine.loyerDynamique.loyerCalcule` |
| `LoyerDynamiquePage` | `fetchEngine` directly | `engineOutputs.loyerDynamique.*` |
| Projection pages | `useEngineWithScenario` | Currently mock data, not yet wired |

**Strategy:** Create `mapProjectionResultsToEngineOutputs(results: MonthlyResult[]): EngineOutputs` that derives the legacy shape from the monthly series. This keeps all existing pages working without changes.

The adapter will:
- Take the last month's row to extract snapshot values (cashEnd, sciCashEnd, totalCAHT, etc.)
- Sum/average across months to derive annualized metrics
- Extract exploitation vs foncière metrics from `projectedByCategory` if present
- Derive `loyerCalcule` from the rent-related entries

**Projection pages** (Sociétés, Banque, Associés) will eventually consume `MonthlyResult[]` directly for time-series charts and tables, but that's a separate wiring step.

---

### 3. Changes to `src/hooks/useEngine.ts`

- Import both adapters
- `fetchEngine`: URL → `"https://pilotagebox-production.up.railway.app/run-projection"`
- `fetchEngine`: body → `JSON.stringify(mapEngineInputsToProjectionInputs(inputs))`
- `fetchEngine`: response → `mapProjectionResultsToEngineOutputs(await res.json())`
- Return type stays `Promise<EngineOutputs>` — all consumers unchanged

---

### 4. Files to create/modify

| Action | File |
|---|---|
| Create | `src/engine/mapToProjectionInputs.ts` — request adapter with corrected mappings |
| Create | `src/engine/mapFromProjectionResults.ts` — response adapter `MonthlyResult[] → EngineOutputs` |
| Modify | `src/hooks/useEngine.ts` — use both adapters, direct Railway URL |

No other files change. All existing pages continue working via the same `EngineOutputs` interface.

