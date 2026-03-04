

# Plan : Module Associés & Sociétés

## Vue d'ensemble

Nouveau module permettant de modéliser la structure de détention (personnes physiques, sociétés, holdings) et de calculer la détention économique finale dans les deux sociétés du projet (Exploitation SAS et Foncière SCI). Le module "Apports associés" est prévu pour plus tard ; la section 4 sera un placeholder en lecture seule.

---

## 1. Types (`src/types/project.ts`)

Nouveaux types :

```typescript
type PersonType = "PHYSIQUE" | "MORALE";
type SocieteType = "HOLDING" | "OPERATIONNELLE" | "SCI" | "AUTRE";

interface Associe {
  id: string;
  type: PersonType;
  nom: string;
  prenom?: string;           // physique only
  societeType?: SocieteType;  // morale only
  // Participations directes dans les 2 sociétés projet
  partExploitation: number;   // 0-100
  partFonciere: number;       // 0-100
  // Participations dans d'autres sociétés (morales) du registre
  participationsIndirectes: { societeId: string; pourcentage: number }[];
}

interface AssociesData {
  associes: Associe[];
}
```

Default : `{ associes: [] }`

Ajouter `associes` dans `ProjectState`, `ValidatedFlags`, `SectionName`.

---

## 2. Context (`ProjectContext.tsx`)

- Ajouter `associes: AssociesData` dans `ProjectState` et `defaultState`
- Ajouter `associes: false` dans `defaultValidated`
- Migration : `associes: parsed.state?.associes ?? DEFAULT_ASSOCIES`

---

## 3. Page (`src/pages/AssociesPage.tsx`)

4 sections via Tabs :

**Section 1 — Liste des personnes et sociétés**
- Tableau listant tous les associés (nom, type, participations directes)
- Bouton "Créer une personne" ouvre un dialog :
  - Choix type (physique/morale)
  - Champs conditionnels (nom, prénom / nom société, type société)
  - Participations directes dans Exploitation et Foncière (% optionnels)
- Édition inline ou via dialog
- Suppression avec confirmation

**Section 2 — Structure de détention (participations indirectes)**
- Pour chaque personne physique : liste des sociétés morales existantes avec champ % de participation
- Validation en temps réel :
  - Exploitation détenue à 100%
  - Foncière détenue à 100%
  - Alerte si détention circulaire détectée
  - Alerte si chaîne ne remonte pas à une personne physique

**Section 3 — Synthèse détentions économiques**
- Tableau : Personne physique | % éco. Exploitation | % éco. Foncière
- Calcul par parcours de graphe (produit des % sur chaque chemin, somme des chemins)
- Tooltip au survol montrant le détail du calcul (chemin × chemin)
- Deux vues toggle :
  - Vue "depuis les sociétés" : pour chaque société, liste des PP avec %
  - Vue "depuis une personne" : pour chaque PP, ses participations

**Section 4 — Synthèse apports associés (placeholder)**
- Message "Les apports associés seront disponibles dans un module dédié"
- Tableau vide avec colonnes : Personne | Capital | CCA | Total

---

## 4. Logique de calcul détention économique

Fonction pure (dans un utilitaire, pas dans le moteur financier car c'est de la structure juridique, pas du calcul financier) :

```typescript
// src/lib/ownershipGraph.ts
function computeEconomicOwnership(associes: Associe[]): 
  { personId: string; exploitation: number; fonciere: number; paths: PathDetail[] }[]
```

Algorithme : DFS depuis chaque personne physique, parcours de toutes les chaînes vers Exploitation/Foncière, produit des % à chaque étage, somme des chemins. Détection de cycles par ensemble de nœuds visités.

---

## 5. Routing & Sidebar

- Route `/associes` dans `App.tsx`
- Entrée "Associés & Sociétés" dans `AppSidebar.tsx` (après Gouvernance, avant Dashboard), icône `Users2`

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Nouveaux types `Associe`, `AssociesData`, defaults, ajout ValidatedFlags |
| `src/contexts/ProjectContext.tsx` | Ajout `associes` dans state + migration |
| `src/lib/ownershipGraph.ts` | **Nouveau** — calcul détention économique |
| `src/pages/AssociesPage.tsx` | **Nouveau** — 4 sections |
| `src/components/AppSidebar.tsx` | Nouvelle entrée |
| `src/App.tsx` | Nouvelle route |

