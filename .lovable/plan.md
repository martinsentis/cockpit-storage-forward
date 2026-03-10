

# Plan : Nettoyage structurel pre-moteur — Implementation

## Verification pre-implementation

- **Aucune dependance circulaire** : `project.ts` n'importe PAS `scenario.ts`. On peut donc supprimer `RentPreset` de `scenario.ts` et utiliser `RentStrategyMode` de `project.ts` sans risque.
- **Le moteur (`engine.ts`, `engineTypes.ts`, `useEngine.ts`) ne reference aucun champ legacy** de GouvernanceData. Aucune modification du moteur necessaire.
- **`buildProjectionInputs` n'est utilise que par `DashboardPage.tsx`** — suppression sans impact sur d'autres pages.

---

## Fichiers a modifier (9 fichiers)

### 1. `src/types/project.ts`

**a) Supprimer `ProjectionInputs` et `PhaseProjection`** (lignes 807-839)
Remplacer par le type `FinancingEntity` centralise :
```typescript
export type FinancingEntity = "FONCIERE" | "EXPLOITATION";
export const FINANCING_ENTITY_LABELS: Record<FinancingEntity, string> = {
  FONCIERE: "Foncière",
  EXPLOITATION: "Exploitation",
};
export const FINANCING_ENTITY_TO_ID: Record<FinancingEntity, string> = {
  FONCIERE: FONCIERE_ENTITY_ID,
  EXPLOITATION: EXPLOITATION_ENTITY_ID,
};
```

**b) Nettoyer `GouvernanceData`** (lignes 449-460) — supprimer les 4 champs legacy, conserver `ccaBalance` :
```typescript
export interface GouvernanceData {
  structureJuridique: string;
  globalRule: GlobalGouvernanceRule;
  entityRules: EntityGouvernanceRule[];
  distributionHistory: DistributionEvent[];
  ccaBalance: number;
}
```

**c) Nettoyer `DEFAULT_GOUVERNANCE`** (lignes 587-597) — retirer les 4 champs legacy.

**d) Renommer `PhaseDraft.entityPorteuse`** (ligne 255) : `"SCI" | "EXPLOITATION"` → `"FONCIERE" | "EXPLOITATION"`

**e) Mettre a jour `createDefaultPhaseDraft`** (ligne 528) : `entityPorteuse: "SCI"` → `"FONCIERE"`

---

### 2. `src/types/scenario.ts`

- Supprimer `export type RentPreset = ...` (ligne 3)
- Importer `RentStrategyMode` depuis `@/types/project`
- Remplacer `rentPreset: RentPreset` par `rentPreset: RentStrategyMode` dans `ScenarioState`

---

### 3. `src/contexts/ProjectContext.tsx`

**a) Supprimer imports** : `ProjectionInputs`, `PhaseProjection`

**b) Supprimer `buildProjectionInputs`** (lignes 572-626) et le retirer de l'interface `ProjectContextValue` (ligne 79) et du Provider value (ligne 633).

**c) Supprimer `phaseCAHT`** (lignes 422-432) — fonction locale doublon de `engine.ts`.

**d) Corriger `migrateGouvernance`** (lignes 244-278) — migration unidirectionnelle :
- Si `g.globalRule` existe deja : l'utiliser tel quel, ne PAS reinjecter les champs legacy.
- Si `g.globalRule` n'existe pas : construire `globalRule` a partir des champs legacy.
- Ne plus persister les champs legacy dans l'objet retourne.

```typescript
function migrateGouvernance(g: any): GouvernanceData {
  const globalRule = g?.globalRule ?? {
    distributableCashRate: g?.distributableCashRate ?? DEFAULT_GLOBAL_RULE.distributableCashRate,
    reserveStrategicRatio: g?.reserveStrategicRatio ?? DEFAULT_GLOBAL_RULE.reserveStrategicRatio,
    minCashReserve: g?.minCashReserve ?? DEFAULT_GLOBAL_RULE.minCashReserve,
    dscrConstraintEnabled: g?.dscrConstraintEnabled ?? DEFAULT_GLOBAL_RULE.dscrConstraintEnabled,
    dividendFlatTaxRate: g?.dividendFlatTaxRate ?? DEFAULT_GLOBAL_RULE.dividendFlatTaxRate,
    allocationOrder: createDefaultAllocationOrder(),
  };
  // ... (entityRules migration stays the same)
  return {
    structureJuridique: g?.structureJuridique ?? DEFAULT_GOUVERNANCE.structureJuridique,
    globalRule,
    entityRules,
    distributionHistory: g?.distributionHistory ?? [],
    ccaBalance: g?.ccaBalance ?? DEFAULT_GOUVERNANCE.ccaBalance,
  };
}
```

---

### 4. `src/pages/DashboardPage.tsx`

- Supprimer `buildProjectionInputs` du destructuring `useProject()`
- Remplacer `runSimulation` par un placeholder desactive :
  - Bouton desactive avec texte "Simulation non connectee"
  - Commentaire `// TODO: simulation remplacee par moteur engine.ts`
- Supprimer les states `loading`, `result`, `error` et les blocs d'affichage JSON associes

---

### 5. `src/pages/ProjectionBanquePage.tsx`

- Supprimer `type FinancingEntity = "FONCIERE" | "EXPLOITATION"` local (ligne 29)
- Ajouter a l'import existant de `@/types/project` : `FinancingEntity`, `FINANCING_ENTITY_LABELS`
- Utiliser `FINANCING_ENTITY_LABELS` dans le Select au lieu des labels en dur

---

### 6. `src/components/ProjectionHeader.tsx`

- Remplacer `import type { RentPreset } from "@/types/scenario"` par `import type { RentStrategyMode } from "@/types/project"`
- Remplacer `Record<RentPreset, string>` par `Record<RentStrategyMode, string>`
- Remplacer les casts `as RentPreset` par `as RentStrategyMode`

---

### 7. `src/contexts/ScenarioContext.tsx`

- Les imports de `ScenarioState` restent inchanges (le type est mis a jour dans scenario.ts)
- Aucune modification directe necessaire car les types sont re-exportes via scenario.ts

---

### 8. `src/components/CapacityPhaseWizard.tsx`

- Ligne 531 : `"SCI" | "EXPLOITATION"` → `"FONCIERE" | "EXPLOITATION"`
- Ligne 533 : `value="SCI"` → `value="FONCIERE"`
- Ligne 534 : label "SCI (fonciere)" → "Fonciere (SCI)"
- Ligne 574 : `=== "SCI" ? "SCI"` → `=== "FONCIERE" ? "Fonciere (SCI)"`

---

### 9. `src/pages/ExploitationPage.tsx`

- Ligne 1208 : `=== "SCI"` → `=== "FONCIERE"`

---

### 10. `src/pages/GouvernancePage.tsx`

- Ligne 541-545 : supprimer la synchronisation legacy dans `save()` :
```typescript
// Avant
const synced: GouvernanceData = {
  ...form,
  distributableCashRate: form.globalRule.distributableCashRate,
};
// Apres
const synced: GouvernanceData = { ...form };
```

---

## Fichiers NON modifies (garde-fou 5)

- `src/engine/engine.ts`
- `src/engine/engineTypes.ts`
- `src/hooks/useEngine.ts`

---

## Resume des suppressions

| Element | Fichier |
|---|---|
| `ProjectionInputs` interface | project.ts |
| `PhaseProjection` interface | project.ts |
| `buildProjectionInputs()` | ProjectContext.tsx |
| `phaseCAHT()` local | ProjectContext.tsx |
| `RentPreset` type | scenario.ts |
| `FinancingEntity` local | ProjectionBanquePage.tsx |
| 4 champs legacy GouvernanceData | project.ts |
| Simulation API call | DashboardPage.tsx |

