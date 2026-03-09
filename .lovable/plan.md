

## Plan : Création de ProjectionBanquePage (avec ajustements)

### Fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/ProjectionBanquePage.tsx` | Créer |
| `src/App.tsx` | Ajouter route + import |
| `src/components/AppSidebar.tsx` | Ajouter lien dans `projectionSections` |

### Types locaux (dans le fichier page)

```typescript
type FinancingEntity = "FONCIERE" | "EXPLOITATION";
type FinancingType = "AMORTIZING" | "BULLET" | "LEASE";
```

### State

- `bankMode`: `"financing" | "monitoring"`
- `entity`: `FinancingEntity` (default `"FONCIERE"`)
- `financingType`: `FinancingType` (default `"AMORTIZING"`)
- `loanAmount`, `interestRate`, `loanDuration`, `gracePeriod`: `number` (default 0)
- `projectionYears`: dérivé de `scenarioState.horizonMonths` (unique variable)

### Mock data

```typescript
const generateBankProjection = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1, revenue: 0, ebe: 0, caf: 0,
    debtService: 0, dscr: 0, cashAfterDebt: 0, cash: 0,
  }));
```

### Structure page

```text
ProjectionHeader

Switch (Simulation financement / Suivi bancaire)

[Si financing:]
  Card "Hypothèses de financement"
    Select entité: Foncière / Exploitation
    Select type: Prêt amortissable / Prêt in fine / Crédit-bail matériel
    Inputs: montant, taux, durée, différé

Card "Résumé du financement"
  Annuité — €, Service dette — €, Capital restant dû — €

Card "Soutenabilité bancaire"
  CAF — €, Service dette — €, DSCR — x, Trésorerie min — €

Card "Graphiques bancaires" (grid-cols-1 lg:grid-cols-3)
  1. ComposedChart: Bar=CAF + Line=debtService
  2. LineChart: DSCR
  3. LineChart: Trésorerie (cash)

Card "Tableau bancaire annuel"
  8 cols: Année | CA | EBE | CAF | Service dette | DSCR | Cash après dette | Trésorerie
```

### Graphique CAF vs dette

`ComposedChart` avec `Bar` pour CAF et `Line` pour service de la dette (pas un simple BarChart).

### App.tsx

Route `/projection-banque` après `/projection-associes`.

### AppSidebar.tsx

Ajouter `{ title: "Projection banque", url: "/projection-banque", icon: Landmark }` dans `projectionSections`.

