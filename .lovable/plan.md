

## Plan : Cohérence Capacitaire → Foncière + améliorations UX

### Diagnostic

**5 problèmes identifiés :**

1. **CAPEX invisible dans Foncière** — Le wizard capacitaire utilise un `debouncedUpdate` (300ms). Quand l'utilisateur clique "Créer", le `onFinalize` lit `phaseData.draft?.capexEstimate` depuis l'état `form` qui peut ne pas contenir les dernières modifications (debounce non flushé). Résultat : `capex` est `undefined` ou vide → aucun `CapexEvent` créé.

2. **Engine ignore les dettes foncières du mauvais tableau** — `computeFonciere()` et `computeLoyerDynamique()` ne lisent que `sciDebts` pour calculer intérêts/principal. Les dettes avec `entityId === "__fonciere__"` restant dans `debts` (créées avant le fix de routage) sont invisibles pour le moteur.

3. **Label "SCI"** — "Synthèse financière SCI" devrait être "Synthèse financière Foncière".

4. **Pas de mini tableau d'amortissement** dans le wizard Financement avant validation.

5. **Vérification entity IDs** — S'assurer que seuls `__fonciere__` et `__exploitation__` sont utilisés.

---

### Modifications

#### 1. `src/components/CapacityPhaseWizard.tsx` — Flush debounce

- Exposer une méthode `flush()` qui annule le timer et exécute `onUpdate` immédiatement.
- Appeler `flush()` dans `goNext()` (changement d'étape) et avant `onFinalize`.
- Modifier le bouton "Créer" pour appeler `flush` puis `onFinalize` après un micro-tick (`setTimeout(onFinalize, 0)`) pour laisser React processer le state.

#### 2. `src/pages/ExploitationPage.tsx` — Flush avant finalize

- Passer le flush comme callback depuis le wizard, ou restructurer le `onFinalize` pour lire directement les données du wizard plutôt que depuis `form`.

Alternative plus robuste : le wizard passe les données finales en argument de `onFinalize(phaseData)` au lieu de laisser le parent les relire depuis son propre state.

#### 3. `src/engine/engine.ts` — Agréger toutes les dettes foncières

Dans `computeFonciere` et `computeLoyerDynamique`, remplacer :
```
inputs.financement.sciDebts.reduce(...)
```
par une agrégation des deux sources :
```
const allSciDebts = [
  ...inputs.financement.sciDebts,
  ...(inputs.financement.debts ?? []).filter(d => d.entityId === "__fonciere__"),
];
```

#### 4. `src/pages/FoncierePage.tsx` — Renommer label

Remplacer "Synthèse financière SCI" par "Synthèse financière Foncière" (3 occurrences : commentaire, titre accordion, libellé résultat).

#### 5. `src/pages/FinancementPage.tsx` — Mini tableau d'amortissement

Dans l'onglet "Résumé" du `FinancingWizard` (crédits bancaires uniquement), ajouter un tableau simplifié :

- **Période de différé** (si applicable) : nombre de mois, intérêts mensuels, mensualité totale (intérêts + assurance)
- **Période d'amortissement** : mensualité capital, intérêts moyens première/dernière année, mensualité totale moyenne

Calcul : amortissement constant (capital/durée) + intérêts dégressifs. Formules simples, pas de tableau ligne par ligne.

---

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/CapacityPhaseWizard.tsx` | Flush debounce avant changement d'étape et avant finalize ; passer données finales en argument de `onFinalize` |
| `src/pages/ExploitationPage.tsx` | Adapter `onFinalize` pour recevoir les données du wizard en paramètre |
| `src/engine/engine.ts` | Agréger `sciDebts` + `debts.filter(__fonciere__)` dans les calculs SCI |
| `src/pages/FoncierePage.tsx` | Renommer "SCI" → "Foncière" dans la synthèse |
| `src/pages/FinancementPage.tsx` | Ajouter mini tableau d'amortissement dans l'onglet Résumé |

