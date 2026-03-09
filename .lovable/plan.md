

## Plan : Corrections structurelles des onglets de projection

### Vue d'ensemble

10 corrections regroupees en 4 fichiers. Creation d'un composant partage pour le slider d'horizon vertical sticky.

### Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/ProjectionHorizonSlider.tsx` | Creer |
| `src/pages/ProjectionSocietesPage.tsx` | Modifier |
| `src/pages/ProjectionAssociesPage.tsx` | Modifier |
| `src/pages/ProjectionBanquePage.tsx` | Modifier |

---

### 1. Nouveau composant : `ProjectionHorizonSlider`

Composant partage, sticky, affiche un slider vertical dans une colonne laterale gauche.

- Lit `scenarioState.horizonMonths` via `useScenario()`
- Modifie via `updateScenarioField("horizonMonths", years * 12)`
- Plage : 0-30 ans, pas de 1
- Affichage : label "Horizon" + valeur en annees
- CSS : `sticky top-20` pour rester visible au scroll
- Slider vertical (orientation verticale via CSS `writing-mode` ou slider horizontal dans colonne etroite)

```text
┌──────────────────────────────────────────┐
│ [Slider sticky]  │  Contenu page        │
│  Horizon          │  ProjectionHeader    │
│  ██ 10 ans       │  Cards, Charts...    │
│                   │                      │
└──────────────────────────────────────────┘
```

Chaque page de projection wrappera son contenu dans un layout flex :
```tsx
<div className="flex gap-6">
  <ProjectionHorizonSlider />
  <div className="flex-1 space-y-6">
    {/* contenu page */}
  </div>
</div>
```

---

### 2. ProjectionSocietesPage

- Supprimer `useState(10)` pour `projectionHorizon`
- Supprimer le slider local (Card avec Slider min=1 max=25)
- Importer `useScenario` et `ProjectionHorizonSlider`
- Calculer `projectionYears = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12))`
- Utiliser `projectionYears` partout (mock data, graphiques, tableau)
- Wrapper dans le layout flex avec `ProjectionHorizonSlider`

---

### 3. ProjectionAssociesPage

- Supprimer les 3 states locaux : `exitValuation`, `ebeMultiple`, `repayCcaFirst`
- Lire depuis `scenarioState.exitHypotheses` (fonciereValuation, exploitationEBEMultiple, repayCcaFirst)
- Modifier via `updateExitHypotheses({ ... })`
- Supprimer `mockInvestors`
- Lire `state.associes.associes` via `useProject()` ; filtrer les personnes physiques (`type === "PHYSIQUE"`)
- Afficher ownership = `partExploitation + partFonciere` (ou agreger selon le modele)
- Wrapper dans le layout flex avec `ProjectionHorizonSlider`

---

### 4. ProjectionBanquePage

- Supprimer `FinancingType` local (`"AMORTIZING" | "BULLET" | "LEASE"`)
- Importer `DebtType` depuis `@/types/project`
- State : `const [financingType, setFinancingType] = useState<DebtType>("BANK_LOAN")`
- Select UX : `BANK_LOAN` → "Pret bancaire", `LEASE` → "Credit-bail materiel"
- Supprimer l'option "Pret in fine" (BULLET)
- Conserver `FinancingEntity` local (correct)
- Wrapper dans le layout flex avec `ProjectionHorizonSlider`

---

### Recapitulatif des suppressions

| Suppression | Page |
|---|---|
| `useState(10)` + slider local horizon | Societes |
| `exitValuation`, `ebeMultiple`, `repayCcaFirst` states | Associes |
| `mockInvestors` | Associes |
| `FinancingType` local + option BULLET | Banque |

### Principe respecte

Les 3 pages deviennent des vues pures : elles lisent `scenarioState` et `ProjectContext`, ne definissent aucune source de configuration.

