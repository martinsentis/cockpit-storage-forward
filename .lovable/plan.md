

## Plan ajusté — Module Gouvernance

### Ajustements intégrés au plan précédent

**1. `CashAllocationStep` — ajout `id`**

```typescript
export interface CashAllocationStep {
  id: string;                    // stable key for reorder UI
  type: CashAllocationStepType;
  mode: AllocationStepMode;      // "RATIO" | "UNTIL_ZERO" | "UNTIL_TARGET"
  ratio: number;
  target?: number;
  label?: string;
}
```

**2. `EntityGouvernanceRule` — ajout `dividendFlatTaxRate`**

```typescript
export interface EntityGouvernanceRule {
  entityId: string;
  // entityId peut référencer :
  // - "__exploitation__" (société d'exploitation système)
  // - "__fonciere__" (SCI foncière système)
  // - un Associe.id de type MORALE (holding utilisateur)
  inheritGlobalRule: boolean;
  transparentDistribution: boolean;
  distributionOverrideEnabled: boolean;
  distributionOverrideAmount: number | null;
  dividendFlatTaxRate: number;       // ajouté — surcharge par entité
  distributableCashRate: number;
  reserveStrategicRatio: number;
  minCashReserve: number;
  dscrConstraintEnabled: boolean;
  allocationOrder: CashAllocationStep[];
}
```

**3. Contrainte transparence → héritage**

Dans le UI et dans la logique de sauvegarde : si `transparentDistribution = true`, forcer `inheritGlobalRule = true`. Le toggle "Règle propre" sera désactivé (disabled + tooltip explicatif). Côté migration, si on détecte `transparentDistribution && !inheritGlobalRule`, on corrige.

**4. Documentation `entityId`**

Commentaire JSDoc sur `EntityGouvernanceRule.entityId` précisant les 3 valeurs possibles (`__exploitation__`, `__fonciere__`, `Associe.id` de type `MORALE`).

### Fichiers impactés

| Fichier | Changements |
|---|---|
| `src/types/project.ts` | Refonte types Gouvernance (ajout `id` sur steps, `AllocationStepMode`, `GlobalGouvernanceRule`, `EntityGouvernanceRule` avec `dividendFlatTaxRate`, `DistributionEvent`, mise à jour `GouvernanceData` et defaults) |
| `src/contexts/ProjectContext.tsx` | Migration legacy → nouveau format, contrainte transparence/héritage, adapter `buildProjectionInputs` |
| `src/pages/GouvernancePage.tsx` | Réécriture complète : 3 onglets (Règle globale, Règles par société, Historique), waterfall configurable, toggle transparence désactive règle propre |

### Default waterfall

```typescript
[
  { id: crypto.randomUUID(), type: "CCA_REPAYMENT", mode: "UNTIL_ZERO", ratio: 100, label: "Remboursement CCA" },
  { id: crypto.randomUUID(), type: "RESERVE", mode: "RATIO", ratio: 20, label: "Réserve stratégique" },
  { id: crypto.randomUUID(), type: "DIVIDENDS", mode: "RATIO", ratio: 80, label: "Distribution dividendes" },
]
```

