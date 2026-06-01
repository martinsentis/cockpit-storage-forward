# Comptes courants non remboursés — corriger la source du solde CCA

## Diagnostic

Le solde CCA utilisé pour estimer le remboursement vient de `state.gouvernance.ccaBalance`. C'est un **champ manuel** sur la gouvernance, **jamais alimenté automatiquement** depuis les apports → il vaut 0 par défaut, donc :
- la page Projection associés calcule `ccaRemaining = 0` → aucun remboursement, même avec « CCA en priorité jusqu'à épuisement ».
- le mapper Railway envoie également `ccaBalanceSas: 0` au backend (et `ccaBalanceSci: 0` toujours).

Or les **vrais** soldes CCA sont stockés dans `state.apports.apports` (items où `type === "CCA"`), avec :
- `beneficiaireId === "__exploitation__"` → CCA SAS
- `beneficiaireId === "__fonciere__"` → CCA Foncière

## Correctif

### 1. Page `ProjectionAssociesPage.tsx`

Calculer les soldes CCA réels à partir des apports :

```ts
const ccaBalanceSas = state.apports.apports
  .filter(a => a.type === "CCA" && a.beneficiaireId === "__exploitation__")
  .reduce((s, a) => s + a.montant, 0);
const ccaBalanceSci = state.apports.apports
  .filter(a => a.type === "CCA" && a.beneficiaireId === "__fonciere__")
  .reduce((s, a) => s + a.montant, 0);
```

Étendre `toYearlyWaterfall` pour accepter `{ ccaBalanceSas, ccaBalanceSci }` au lieu du seul `gouvernance.ccaBalance`, et appliquer l'algorithme par entité :
- SAS : prélève sur `ccaRemainingSas` selon `ccaPriorityRatio` / `UNTIL_ZERO`, puis réserve, puis dividendes.
- Foncière : même logique sur `ccaRemainingSci` (au lieu d'ignorer le CCA SCI comme aujourd'hui).

### 2. Mapper Railway (`src/engine/mapToProjectionInputs.ts`)

Remplacer le calcul actuel de `ccaBalanceSas` / `ccaBalanceSci` par la même somme sur les apports :
- `ccaBalanceSas = somme apports CCA → __exploitation__`
- `ccaBalanceSci = somme apports CCA → __fonciere__`

(Cela règle aussi la limitation #2 du `MAPPING_AUDIT.md` côté SCI.)

### 3. `MAPPING_AUDIT.md`

Mettre à jour la limitation #2 : `ccaBalanceSci` est désormais dérivé des apports (plus une limitation).

## Fichiers touchés

- `src/pages/ProjectionAssociesPage.tsx`
- `src/engine/mapToProjectionInputs.ts`
- `MAPPING_AUDIT.md`

Aucun changement de types, de gouvernance, ni de backend.

## Hors scope

- Refondre l'UI Gouvernance pour supprimer/lier le champ `ccaBalance` manuel (à voir plus tard pour éviter la double saisie).
- Émission backend des catégories `*_DISTRIBUTION_*` (limitation #6 inchangée).
