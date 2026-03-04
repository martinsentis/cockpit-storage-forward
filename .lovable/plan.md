

# Plan : Dates calendaires sur tous les modules

## Constat

Les dates calendaires (via `formatMonthIndex`) sont déjà appliquées sur **Exploitation** et **Projet**. Les modules **Build**, **Financement** et **Gouvernance** n'ont actuellement aucun champ `monthIndex` dans leur UI, mais certains devraient en avoir.

## Modifications

### 1. `src/types/project.ts` — Ajouter des champs monthIndex manquants

- **BuildData** : ajouter `startMonth: number` (début travaux) et `durationMonths: number` (durée travaux)
- **DEFAULT_BUILD** : `startMonth: 0`, `durationMonths: 6`

### 2. `src/pages/BuildPage.tsx` — Annoter avec dates calendaires

Ajouter deux champs :
- "Début des travaux" : input `startMonth` + annotation `(Juin 2026)`
- "Durée des travaux" : input `durationMonths` + annotation `jusqu'à Décembre 2026`
- "Fin des travaux" : calculé et affiché = `startMonth + durationMonths`

Importer `formatMonthIndex`, `formatMonthRange`, `monthLabel` depuis `monthUtils`.

### 3. `src/pages/FinancementPage.tsx` — Annoter les dettes

Le module actuel n'expose pas encore les dettes en UI (note "version ultérieure"). Ajouter un tableau simple pour `debts` et `sciDebts` avec :
- `deferralMonths` annoté avec la date calendaire (`mois X (Mois Année)`)
- `durationMonths` annoté avec la date de fin (`jusqu'à Mois Année`)

Chaque dette : label, montant, taux, durée (avec date fin), différé (avec date début remboursement). Bouton ajouter/supprimer.

### 4. `src/pages/GouvernancePage.tsx` — Pas de monthIndex

Aucun champ temporel dans ce module actuellement. Pas de modification nécessaire.

### 5. `src/components/ProjectTimeline.tsx` — Ajouter événement Build

Ajouter un marqueur pour le début et la fin des travaux depuis `state.build.startMonth` et `state.build.startMonth + state.build.durationMonths`.

Nouvelle catégorie `build` (couleur jaune/amber).

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Ajouter `startMonth`, `durationMonths` à `BuildData` |
| `src/pages/BuildPage.tsx` | Ajouter inputs mois + annotations calendaires |
| `src/pages/FinancementPage.tsx` | Ajouter tableau dettes avec annotations calendaires |
| `src/components/ProjectTimeline.tsx` | Ajouter marqueurs Build |

