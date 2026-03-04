

# Plan : Dates calendaires UX sur monthIndex

## Résumé

Ajouter un champ `projectStartDate` dans les paramètres projet (mois 0 du modèle). Créer une fonction utilitaire `formatMonthIndex` qui convertit un index en date lisible. Afficher partout `mois X (Mois Année)` sans modifier le modèle interne.

## 1. `src/types/project.ts`

Ajouter à `ProjetData` :
```ts
projectStartDate: string; // ISO format "2026-06" (year-month)
```

Mettre à jour `DEFAULT_PROJET` : `projectStartDate: "2026-06"`.

## 2. `src/lib/monthUtils.ts` — Nouveau fichier

```ts
export function formatMonthIndex(monthIndex: number, projectStartDate: string): string {
  const [year, month] = projectStartDate.split("-").map(Number);
  const date = new Date(year, month - 1 + monthIndex);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatMonthRange(startMonth: number, durationMonths: number, projectStartDate: string): string {
  return formatMonthIndex(startMonth + durationMonths - 1, projectStartDate);
}
```

## 3. `src/pages/ProjetPage.tsx`

Ajouter un champ "Date de début du projet" avec deux inputs (mois select 1-12 + année input), stocké en format `"YYYY-MM"`.

## 4. `src/pages/ExploitationPage.tsx`

Importer `formatMonthIndex`. Pour chaque champ monthIndex, ajouter un label contextuel :

- **Phase startMonth** (l.428) : afficher `(Septembre 2026)` à côté de l'input
- **Ramp-up durée** (l.444) : afficher `jusqu'à {formatMonthRange(...)}` 
- **Gestionnaire dateDebutMois** (l.561) : afficher la date à côté
- **Charge startMonth** (l.691) : afficher la date à côté
- **Charge endMonth** (l.692) : afficher la date à côté
- **Graphique ramp-up** XAxis (l.480) : formatter les ticks en dates calendaires

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/types/project.ts` | Ajouter `projectStartDate` à `ProjetData` + default |
| `src/lib/monthUtils.ts` | Créer fonctions `formatMonthIndex` et `formatMonthRange` |
| `src/pages/ProjetPage.tsx` | Ajouter input date de début projet |
| `src/pages/ExploitationPage.tsx` | Annoter tous les monthIndex avec dates calendaires |

