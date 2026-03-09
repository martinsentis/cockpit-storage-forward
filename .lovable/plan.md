

## Plan : Réécriture complète de ProjectionSocietesPage

Remplacement du contenu actuel (basé sur le moteur) par une structure UI avec données mockées et les ajustements demandés.

### Fichier modifié

`src/pages/ProjectionSocietesPage.tsx` — réécriture complète

### Contenu

**Imports** : `useState` de react, `ProjectionHeader`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Slider`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, et depuis recharts : `ResponsiveContainer`, `BarChart`, `Bar`, `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`.

Suppression de tous les imports moteur (`useEngineWithScenario`, `Tabs`, `Badge`, `useProject`).

**Mock data** :
```typescript
const generateMockData = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1, revenue: 0, ebe: 0, netResult: 0, cash: 0,
  }));
```

**State** : `const [projectionHorizon, setProjectionHorizon] = useState(10);`

**Structure verticale** :
1. Titre h1 + `<ProjectionHeader />`
2. Slider horizon (1-25, step 1) avec label `"Horizon de projection : {projectionHorizon} ans"`
3. Grid `grid-cols-1 md:grid-cols-2 gap-4` avec 2 Cards :
   - **Exploitation** : CA HT, EBE, Résultat net, Trésorerie fin d'année, Loyer versé — tous affichés `— €`
   - **Foncière** : Loyers encaissés, EBE, Résultat net, Trésorerie fin d'année, Loyer reçu — tous `— €`
4. Card "Performance" : `ResponsiveContainer` + `BarChart` avec `mockData`, 3 `Bar` (revenue=bleu `#3b82f6`, ebe=vert `#22c55e`, netResult=orange `#f97316`), `XAxis dataKey="year"`, `YAxis`, `CartesianGrid`, `Tooltip`
5. Card "Trésorerie cumulée" : `ResponsiveContainer` + `LineChart`, `Line dataKey="cash"`, même axes
6. Card "Tableau annuel" : Table avec colonnes Année/CA/EBE/Résultat net/Trésorerie, `mockData.map()` pour les lignes, valeurs à `0 €`

