

## Plan : Ajout du point mort dans ProjectionSocietesPage

### Fichier modifié
`src/pages/ProjectionSocietesPage.tsx`

### 1. Mock data

```typescript
const generateMockData = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    revenue: 0,
    ebe: 0,
    netResult: 0,
    cash: 0,
    breakEvenRevenue: 0,
    sustainabilityRevenue: 0,
    breakEvenSurface: 0,
    sustainabilitySurface: 0,
    breakEvenOccupancy: 0,
    sustainabilityOccupancy: 0,
  }));
```

### 2. Commentaire en haut du fichier

```
// TODO moteur financier
// Les indicateurs de point mort sont affichés uniquement à titre structurel.
// Toutes les valeurs seront calculées par le moteur financier.
// L'interface ne doit effectuer aucun calcul économique.
```

### 3. Card Exploitation — structure enrichie

Indicateurs existants (CA HT, EBE, Résultat net, Trésorerie, Loyer versé) conservés avec `— €`.

Puis Separator + **Point mort exploitation** (3 lignes : Surface louée `— m²`, Taux de remplissage `— %`, CA correspondant `— €`).

Puis Separator + **Point mort soutenabilité financière** (mêmes 3 lignes).

### 4. Graphique Performance → ComposedChart

Remplacer `BarChart` par `ComposedChart`. Conserver les 3 `Bar` (CA, EBE, Résultat net). Ajouter deux `ReferenceLine` horizontales :
- Seuil exploitation : `y={0}` rouge pointillé
- Seuil soutenabilité : `y={0}` orange pointillé

Imports ajoutés : `ComposedChart`, `ReferenceLine` de recharts.

### 5. Nouveau graphique — Card "Seuil de rentabilité – exploitation"

Placé après le graphique Trésorerie cumulée. `LineChart` avec 3 `Line` :
- CA exploitation (`revenue`, bleu)
- Seuil exploitation (`breakEvenRevenue`, rouge)
- Seuil soutenabilité (`sustainabilityRevenue`, orange)

Texte explicatif sous le graphique :
> "Le point mort correspond au niveau de chiffre d'affaires nécessaire pour couvrir les charges de l'exploitation. Le seuil de soutenabilité inclut également les remboursements de dette et les contraintes de trésorerie."

### 6. Imports ajoutés

`ComposedChart`, `ReferenceLine` de recharts. `Separator` de `@/components/ui/separator`.

### Structure résultante

```text
ProjectionHeader
Slider horizon
Grid 2 cols:
  Card Exploitation (indicateurs + separator + point mort exploitation + separator + point mort soutenabilité)
  Card Foncière (inchangée)
Card Performance (ComposedChart: 3 Bar + 2 ReferenceLine)
Card Trésorerie cumulée (inchangé)
Card Seuil de rentabilité – exploitation (LineChart + texte explicatif)
Card Tableau annuel (inchangé)
```

