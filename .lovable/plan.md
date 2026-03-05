

## Plan : Refonte GouvernancePage en 2 colonnes avec simulateur pédagogique

### Seul fichier impacté : `src/pages/GouvernancePage.tsx`

Aucun changement sur le modèle de données, la logique de sauvegarde, WaterfallEditor, EntityRuleCard, ni l'onglet Historique.

---

### 1. Layout 2 colonnes (onglet "Règle globale" uniquement)

Remplacer le contenu de `TabsContent value="global"` par un `grid grid-cols-5 gap-6` :
- Colonne gauche (`col-span-3`) : 4 blocs de paramétrage
- Colonne droite (`col-span-2`) : composant `GouvernanceSimulator` sticky

### 2. Colonne gauche — 4 blocs

**Bloc 1 — Cash disponible** (informatif, aucun champ)
- Titre + description : "Le cash disponible correspond à la trésorerie restante après exploitation, remboursement de la dette et paiement des impôts."
- Encart Alert : "Le cash distribuable est calculé par entité. Chaque entité possède sa propre trésorerie et sa propre logique de distribution."

**Bloc 2 — Contraintes de prudence** (champs existants déplacés)
- `minCashReserve` (€) — "Après distribution, la société doit conserver au moins ce niveau de trésorerie."
- `dscrConstraintEnabled` (switch) — "La distribution est bloquée si la société ne couvre plus correctement le service de sa dette." + texte pédagogique DSCR
- Retirer `distributableCashRate` de ce bloc (déplacé vers Bloc 3)

**Bloc 3 — Calcul du cash distribuable** (1 champ)
- `distributableCashRate` (%) — "Part maximale du cash disponible pouvant être distribuée chaque année."
- Formule affichée : `cash_distribuable = min(cash × ratio, cash − réserve_minimum)`

**Bloc 4 — Waterfall de distribution** (inchangé)
- WaterfallEditor existant avec description

Le Bloc C "Fiscalité des dividendes" (PFU) est conservé en dessous de la waterfall comme bloc complémentaire.

### 3. Colonne droite — `GouvernanceSimulator`

Composant inline dans le même fichier. Sticky (`sticky top-4`). Reçoit `form.globalRule` en props.

**En-tête** : Alert avec texte "Exemple pédagogique. Les montants utilisés dans ce simulateur sont fixes et servent uniquement à illustrer le fonctionnement des règles de gouvernance. Ils ne correspondent pas aux données réelles du projet."

**Hypothèses fixes** : Trésorerie = 20 000 €, Résultat net = 50 000 €, Cash disponible = 70 000 €

**Étape 1 — Cash disponible** : Affiche 20 000 + 50 000 = 70 000 €

**Étape 2 — Contraintes de prudence** :
- Réserve minimum : affiche `minCashReserve`, calcule 70 000 − minCashReserve = X €
- Si DSCR activé : "Protection dette activée — Distribution autorisée uniquement si DSCR ≥ seuil"
- Sinon : "Protection dette désactivée"

**Étape 3 — Cash distribuable** : Affiche les deux limites séparément :
- Limite par ratio : 70 000 × distributableCashRate = Y €
- Limite par réserve : 70 000 − minCashReserve = X €
- Cash distribuable = min(X, Y) — valeur retenue mise en évidence (font-bold, bg coloré)

**Étape 4 — Waterfall** : Itère sur `form.globalRule.allocationOrder`, pour chaque step :
- Calcul du montant alloué selon le mode (RATIO → cashDistribuable × ratio/100, UNTIL_TARGET → min(target, restant), UNTIL_ZERO → restant)
- Affiche : nom de l'étape, montant alloué, montant restant
- Barre de progression (Progress component) avec les couleurs de STEP_COLORS

Le simulateur se recalcule automatiquement car il lit directement les valeurs du state `form`.

### Structure visuelle

```text
┌─────────────────────────────────────────────────────┐
│  Gouvernance des flux                               │
│  [Règle globale] [Par société] [Historique]         │
├──────────────────────────┬──────────────────────────┤
│  col-span-3              │  col-span-2 (sticky)     │
│                          │                          │
│  Card: Cash disponible   │  Alert: Exemple péda.    │
│    (informatif)          │                          │
│                          │  Étape 1: 70 000 €       │
│  Card: Prudence          │  Étape 2: contraintes    │
│    minCash, DSCR         │  Étape 3: 2 limites      │
│                          │    → min(X,Y) en gras    │
│  Card: Cash distribuable │  Étape 4: waterfall      │
│    ratio %               │    CCA: xx € (reste: ..) │
│                          │    Réserve: xx €          │
│  Card: Waterfall         │    Dividendes: xx €       │
│    WaterfallEditor       │    [barres progression]  │
│                          │                          │
│  Card: Fiscalité (PFU)   │                          │
│                          │                          │
│  [Enregistrer]           │                          │
└──────────────────────────┴──────────────────────────┘
```

