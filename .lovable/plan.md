

# Plan : Timeline Visuelle du Projet

## Résumé

Créer un composant `ProjectTimeline` qui affiche une frise horizontale avec repères annuels, mois clés et événements du projet positionnés par `monthIndex`. Le composant est en lecture seule et utilise `formatMonthIndex` existant. Il sera affiché en haut du Dashboard.

## 1. `src/components/ProjectTimeline.tsx` — Nouveau composant

### Données lues depuis le contexte
- `state.projet.horizonMonths`, `state.projet.projectStartDate`
- `state.exploitation.capacityPhases` (startMonth, rampUpMonths, nom)
- `state.exploitation.gestionnaires` (dateDebutMois, nom)
- `state.financement.debts` (label, durationMonths, deferralMonths)

### Structure visuelle
- Barre horizontale scrollable représentant l'horizon (0 → horizonMonths)
- **Repères principaux** : tick + label tous les 12 mois ("Année 1", "Année 2"...) avec date calendaire
- **Repères secondaires** : petits ticks tous les 6 mois
- **Marqueurs d'événements** : pastilles colorées positionnées sur la barre, par catégorie :
  - Bleu : début projet (mois 0)
  - Vert : début commercial par phase (`phase.startMonth`)
  - Orange : fin ramp-up par phase (`phase.startMonth + phase.rampUpMonths`)
  - Violet : embauches gestionnaires (`gestionnaire.dateDebutMois`)
  - Rouge : début dettes (`debt.deferralMonths`)

### Tooltip au survol
Chaque marqueur affiche un tooltip Radix avec :
- Nom de l'événement
- `mois X (Mois Année)` via `monthLabel()`

### Layout
- Container horizontal avec `overflow-x-auto`
- Hauteur fixe ~120px
- Responsive : scroll horizontal si l'horizon est large

## 2. `src/pages/DashboardPage.tsx`

Ajouter `<ProjectTimeline />` en haut, avant la carte Dashboard existante.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/ProjectTimeline.tsx` | Nouveau composant timeline |
| `src/pages/DashboardPage.tsx` | Intégrer la timeline en haut |

