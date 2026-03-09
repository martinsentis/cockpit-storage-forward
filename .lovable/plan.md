

## Plan : Onglet "Détail moteur" + 4 composants engine

### Fichiers

| Fichier | Action |
|---|---|
| `src/components/engine/EngineInspector.tsx` | Nouveau |
| `src/components/engine/EngineMonthlyPnL.tsx` | Nouveau |
| `src/components/engine/EngineFormulaInspector.tsx` | Nouveau |
| `src/components/engine/EngineLedgerView.tsx` | Nouveau |
| `src/pages/ProjectionSocietesPage.tsx` | Ajouter onglet "Détail moteur" |

### Détail

**`ProjectionSocietesPage.tsx`** — Ajouter un 3e `TabsTrigger value="moteur"` dans le TabsList existant (l.26-29). Ajouter `TabsContent value="moteur"` rendant `<EngineInspector />`. Import du composant.

**`EngineInspector.tsx`** — `const projectionData = null`. Tabs internes avec 3 sous-onglets :
- "PNL mensuel" → `<EngineMonthlyPnL data={projectionData} />`
- "Explication des calculs" → `<EngineFormulaInspector data={projectionData} />`
- "Ledger des flux" → `<EngineLedgerView data={projectionData} />`

**`EngineMonthlyPnL.tsx`** — Props : `data?: any`, `highlightedCells?: string[]` (default `[]`), `onCellClick?: (cellId: string) => void`. Table avec 11 colonnes (Mois, Revenus, Charges exploitation, EBE, Amortissements, Résultat exploitation, Résultat net, IS provisionné, Cash-flow opérationnel, Service de dette, Cash-flow net). Si `!data` : body vide + message placeholder. Cellules dans `highlightedCells` reçoivent `bg-amber-50 cursor-pointer` + icône AlertTriangle. Clic sur cellule highlightée → ouvre un Sheet avec message placeholder. State local `selectedCell` pour gérer l'ouverture du Sheet.

**`EngineFormulaInspector.tsx`** — Props : `data?: any`. Card avec message « Les explications de calcul apparaîtront ici lorsque le moteur sera connecté. »

**`EngineLedgerView.tsx`** — Props : `data?: any`. Table avec 5 colonnes (Date, Entité, Type de flux, Description, Montant). Si `!data` : body vide + message placeholder.

### Contraintes respectées
- Aucun appel useEngine
- Aucune logique financière
- Aucune modification ProjectState / ScenarioState
- Robuste si `data === null`

