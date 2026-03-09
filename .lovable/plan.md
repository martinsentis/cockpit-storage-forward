

## Plan : Réécriture complète de ProjectionAssociesPage

### Fichier modifié
`src/pages/ProjectionAssociesPage.tsx` — réécriture complète

### Structure

```text
// TODO moteur financier (commentaire en haut)

ProjectionHeader
Card Hypothèses de sortie
  - Texte horizon (lecture seule)
  - Input valeur foncière
  - Input multiple EBE
  - Checkbox remboursement CCA
"Horizon de projection : X ans"
Card Waterfall des flux consolidés (exploitation + foncière)
  - Table 7 colonnes : Année | Résultat net total | Cash disponible | Dividendes | CCA remboursés | Cash distribué total | Trésorerie restante
Card Graphique flux associés
  - BarChart 3 séries : Dividendes (bleu), CCA remboursés (vert), Cash distribué total (violet)
Card Décomposition de la valeur equity à la sortie
  - Texte : "La vente simulée correspond à la cession des deux sociétés..."
  - Table source/montant (5 lignes)
Fiches associés (grid responsive, 3 Cards)
  - Nom + Badge ownership
  - RUN : CCA remboursé, Dividendes bruts, Dividendes nets
  - EXIT : Part valorisation exploitation, Part trésorerie exploitation, Part valorisation foncière, Part trésorerie foncière
  - SYNTHÈSE : Apport initial, Cash total brut, Cash total net, Multiple, TRI brut
```

### Horizon
```typescript
const { scenarioState } = useScenario();
const projectionHorizon = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12));
```

### Mock data
```typescript
const mockInvestors = [
  { name: "Associé A", ownership: 0.40 },
  { name: "Associé B", ownership: 0.35 },
  { name: "Associé C", ownership: 0.25 },
];

const generateWaterfall = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1, netResult: 0, cashAvailable: 0,
    dividends: 0, ccaRepayment: 0, totalDistributed: 0, remainingCash: 0,
  }));
```

### Imports
`useState`, `useScenario`, `ProjectionHeader`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Separator`, `Input`, `Label`, `Checkbox`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, recharts (`ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`)

Suppression des anciens imports (`ExitHypothesesPanel`, `Users2`, `CardDescription`).

