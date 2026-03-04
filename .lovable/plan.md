

# Plan : Module Apports Associés

## Vue d'ensemble

Nouveau module dédié aux flux financiers d'apports (capital et CCA) des associés vers les sociétés du projet. Séparé de la structure capitalistique (qui reste dans Associés & Sociétés). Les données sont stockées dans le state projet et la section 4 placeholder d'AssociesPage sera connectée en lecture seule.

---

## 1. Types (`src/types/project.ts`)

```typescript
export type ApportType = "CAPITAL" | "CCA";
export type ApportStatut = "PREVU" | "REALISE";

export interface ApportItem {
  id: string;
  apporteurId: string;       // ref Associe.id
  beneficiaire: "EXPLOITATION" | "FONCIERE";
  type: ApportType;
  montant: number;
  date: string;              // "YYYY-MM"
  statut: ApportStatut;
  commentaire?: string;
}

export interface ApportsData {
  apports: ApportItem[];
}

export const DEFAULT_APPORTS: ApportsData = { apports: [] };
```

Ajouter `apports: ApportsData` dans `ProjectState`, `apports: boolean` dans `ValidatedFlags`, `SectionName`.

---

## 2. Context (`ProjectContext.tsx`)

- Ajouter `apports` dans `defaultState` et migration (`parsed.state?.apports ?? DEFAULT_APPORTS`)
- Ajouter `apports: false` dans `defaultValidated`

---

## 3. Page (`src/pages/ApportsPage.tsx`) — Nouvelle page

3 sections via Tabs :

**Section 1 — Tableau des apports**
- Table avec colonnes : Date, Apporteur (nom résolu depuis associés), Bénéficiaire, Type, Montant, Statut, Commentaire
- Actions : éditer, supprimer

**Section 2 — Création / édition d'un apport**
- Dialog avec formulaire :
  - Apporteur : Select parmi les associés existants (personnes physiques + morales)
  - Bénéficiaire : Select (Exploitation / Foncière)
  - Type : Capital / CCA
  - Montant, Date (YYYY-MM), Statut (Prévu / Réalisé), Commentaire

**Section 3 — Synthèse**
- Tableau par associé : Capital apporté, CCA apporté, Total
- Tableau par société : Capital reçu, CCA reçu, Total

---

## 4. Mise à jour AssociesPage section 4

Remplacer le placeholder par une lecture seule des données `state.apports.apports` :
- Tableau par associé avec Capital / CCA / Total
- Bouton "Voir module Apports associés" → lien vers `/apports`

---

## 5. Routing & Sidebar

- Route `/apports` dans `App.tsx`
- Entrée "Apports associés" dans `AppSidebar.tsx` (après Associés, avant Dashboard), icône `Wallet` ou `Banknote`

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Nouveaux types `ApportItem`, `ApportsData`, default, ValidatedFlags |
| `src/contexts/ProjectContext.tsx` | Ajout `apports` dans state + migration |
| `src/pages/ApportsPage.tsx` | **Nouveau** — 3 sections |
| `src/pages/AssociesPage.tsx` | Section 4 connectée en lecture seule |
| `src/components/AppSidebar.tsx` | Nouvelle entrée |
| `src/App.tsx` | Nouvelle route |

