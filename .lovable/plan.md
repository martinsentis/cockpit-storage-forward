

# Plan : Refonte Bloc Box — Phases de Capacité + Ramp-up

## Résumé

Remplacer le bloc Box monolithique par un système multi-phases. Chaque phase représente une tranche physique avec sa propre capacité (macro ou typologie), ses dates commerciales et sa courbe de ramp-up. La synthèse agrège toutes les phases.

## 1. `src/types/project.ts` — Nouveaux types

**Nouveau type `CapacityPhase`** (remplace l'usage direct de `Capacite` + `modeBox`) :

```ts
export type RampCurve = "LINEAR" | "FAST_START" | "SLOW_START";

export interface CapacityPhase {
  id: string;
  nom: string;
  surface: number;
  modeBox: BoxMode;
  // Macro
  prixM2: number;
  prixType: "HT" | "TTC";
  vatRate: number;
  // Typologie
  typologies: Typologie[];
  // Dates
  startMonth: number; // mois début commercial
  // Ramp-up
  targetOccupancy: number; // ex: 0.85
  rampUpMonths: number;
  rampCurve: RampCurve;
}
```

**Modifier `Typologie`** : ajouter `prixType: "HT" | "TTC"` et `vatRate: number`.

**Modifier `ExploitationData`** : remplacer `modeBox` + `capacite` + `phases` par `capacityPhases: CapacityPhase[]`. Garder `services`, `gestionnaires`, `charges`.

**Mettre à jour `DEFAULT_EXPLOITATION`** avec une phase par défaut.

**Mettre à jour `Phase`** : supprimer l'ancien type `Phase` (startMonth/endMonth/occupancyRate) — remplacé par les données de ramp-up dans `CapacityPhase`.

**Mettre à jour `ProjectionInputs`** : adapter `phases` et `revenueParams` pour agréger les données de toutes les phases actives.

## 2. `src/contexts/ProjectContext.tsx`

Adapter `buildProjectionInputs()` :
- Agréger surface totale et CA de toutes les phases
- Générer les phases de projection depuis les ramp-up de chaque `CapacityPhase`
- Défensive init pour `capacityPhases`

## 3. `src/pages/ExploitationPage.tsx` — Refonte Bloc 1

**Remplacer le Bloc 1 actuel** par un système de phases :

### Section 1 — Liste des phases
- Accordion ou Tabs par phase
- Bouton "Ajouter une phase" (max 4)
- Chaque phase : nom éditable, bouton supprimer

### Section 2 — Capacité par phase
- Toggle Macro / Typologie (identique à l'existant mais par phase)
- **Macro** : surface, prix m², sélecteur HT/TTC, taux TVA, CA HT et TTC calculés
- **Typologie** : table dynamique par phase avec prix HT/TTC et TVA par ligne
- Résumé en bas : surface phase, CA 100% HT/TTC, prix m² implicite

### Section 3 — Dates
- Input "Mois de début commercial" par phase

### Section 4 — Ramp-up
- Inputs : occupancy cible (%), durée montée (mois), type courbe (select LINEAR/FAST_START/SLOW_START)
- Calculs affichés : surface cible m², CA cible HT, CA cible TTC
- Mini graphique recharts (LineChart) : % surface louée vs temps

### Section 5 — Alerte cohérence
- Lors de l'ajout d'une nouvelle phase (pas la première), afficher un `AlertDialog` :
  "Cette tranche implique un investissement. Souhaitez-vous créer l'événement de financement associé ?"
  - Options : "Utiliser trésorerie", "Apport associés", "Dette", "Mix"
  - Option dette/mix → `navigate("/financement")`

### Résumé global (sous toutes les phases)
- Surface totale active (somme phases)
- CA total 100% HT/TTC
- Nb box total
- Prix m² moyen global

**Adapter les blocs Services et Synthèse** pour utiliser les agrégats des phases au lieu de l'ancien `capacite`.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Ajouter `CapacityPhase`, `RampCurve`, modifier `Typologie`, `ExploitationData`, supprimer ancien `Phase` |
| `src/contexts/ProjectContext.tsx` | Adapter `buildProjectionInputs()`, défensive init |
| `src/pages/ExploitationPage.tsx` | Refonte bloc Box en système multi-phases avec ramp-up et graphique |

