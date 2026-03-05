

## Plan : Restructuration Gouvernance en 3 blocs + Auto-validation

### Changement 1 — Auto-validation dans `src/contexts/ProjectContext.tsx`

**Ligne 400** : ajouter `validated: { ...entry.validated, [section]: true }` dans le callback `updateSection`.

Avant :
```
state: { ...entry.state, [section]: { ...entry.state[section], ...data } },
```

Après :
```
state: { ...entry.state, [section]: { ...entry.state[section], ...data } },
validated: { ...entry.validated, [section]: true },
```

Toute sauvegarde marque automatiquement la section comme validée.

---

### Changement 2 — Restructuration de `src/pages/GouvernancePage.tsx`

#### Onglet "Règle globale" — remplacer les 2 cartes actuelles par 3 cartes :

**Bloc A — Contraintes de prudence** (Card)
- `distributableCashRate` (%) — ratio max de cash distribuable
- `minCashReserve` (€) — trésorerie plancher
- `dscrConstraintEnabled` (switch)
- Note explicative : "Formule : `cash_distribuable = min(cash × taux, cash − réserve)`"
- **Retirer** `reserveStrategicRatio` (déjà dans step RESERVE de la waterfall)
- **Retirer** `dividendFlatTaxRate` (déplacé vers Bloc C)

**Bloc B — Waterfall de distribution** (Card — inchangé)
- Texte introductif : "Séquence d'allocation du cash distribuable calculé par les contraintes ci-dessus"
- `WaterfallEditor` existant
- Chaque step possède bien `type: CashAllocationStepType` (`CCA_REPAYMENT | RESERVE | DIVIDENDS`) — vérifié dans le code

**Bloc C — Fiscalité des dividendes** (Card — nouvelle)
- `dividendFlatTaxRate` (%) — PFU
- Note : "Appliqué au niveau de la personne physique. Distingue dividendes bruts et dividendes nets."

#### `EntityRuleCard` — quand `inheritGlobalRule = false` :

Restructurer le grid actuel (lignes 208-280) en 3 sections :

**Section A** — Contraintes de prudence :
- `distributableCashRate`, `minCashReserve`, `dscrConstraintEnabled`
- **Retirer** `reserveStrategicRatio`

**Section B** — Waterfall :
- `WaterfallEditor` (déjà présent, inchangé)

**Section C** — Fiscalité :
- `dividendFlatTaxRate`

+ Override de distribution (section existante, conservée telle quelle)

#### Fonction `save()` :

Retirer la synchro `reserveStrategicRatio` (ligne 328) car ce champ n'est plus exposé hors waterfall.

---

### Vérification du champ `type` sur les waterfall steps

Confirmé dans le code existant :
- `CashAllocationStep` a `type: CashAllocationStepType`
- `CashAllocationStepType = "CCA_REPAYMENT" | "RESERVE" | "DIVIDENDS"`
- `createDefaultAllocationOrder()` crée 3 steps avec les bons types
- `WaterfallEditor` utilise `CASH_ALLOCATION_STEP_LABELS[step.type]` et `STEP_COLORS[step.type]`
- Aucun changement de modèle nécessaire

### Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/contexts/ProjectContext.tsx` | 1 ligne ajoutée dans `updateSection` |
| `src/pages/GouvernancePage.tsx` | Restructuration UI en 3 blocs (global + entity) |

