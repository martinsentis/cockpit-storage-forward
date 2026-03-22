

## Plan : Ajout des champs backend + sciOtherRevenuesMonthly

### 1. BackendMonthlyResult — ajouter 2 champs

**Fichier** : `src/hooks/useEngine.ts`, ligne 122-131

Ajouter `leasedSurfacePercent` et `sciAmortization` à l'interface :

```typescript
export interface BackendMonthlyResult {
  monthIndex: number;
  cashEnd: number;
  sciCashEnd: number;
  dscr: number;
  leasedSurface: number;
  activeSurface: number;
  leasedSurfacePercent: number;
  sciAmortization: number;
  projectedByCategory?: Record<string, number>;
  warnings?: string[];
}
```

### 2. EngineMonthlyPnL — utiliser leasedSurfacePercent

**Fichier** : `src/components/engine/EngineMonthlyPnL.tsx`

- **Table SAS** (buildSasRows) : remplacer le calcul `leasedSurface / activeSurface` par `m.leasedSurfacePercent`. Affichage : `(month.leasedSurfacePercent * 100).toFixed(1) + '%'`.
- **Table SCI** (buildSciRows + SciTable) : ajouter une colonne "Amortissement" affichant `month.sciAmortization` via `fmt()`.

### 3. ProjectionInputs — ajouter sciOtherRevenuesMonthly

**Fichier** : `src/engine/mapToProjectionInputs.ts`

- Ajouter `sciOtherRevenuesMonthly: number` dans l'interface `ProjectionInputs`.
- Dans l'objet retourné par `mapToProjectionInputs`, calculer la valeur depuis `project.fonciere.otherRevenues` (filtre actifs, conversion HT, mensualisation si annuel).

### Fichiers modifiés

1. `src/hooks/useEngine.ts` — 2 lignes ajoutées dans l'interface
2. `src/components/engine/EngineMonthlyPnL.tsx` — calcul % surface + colonne amortissement SCI
3. `src/engine/mapToProjectionInputs.ts` — champ sciOtherRevenuesMonthly dans interface + return

