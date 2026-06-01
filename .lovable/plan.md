# Sélection associé sur le graphique de flux distribués

Ajouter un sélecteur au-dessus du graphique « Flux distribués aux associés » dans `src/pages/ProjectionAssociesPage.tsx`.

## Comportement

- Un `Select` shadcn affiché dans le `CardHeader` du graphique.
- Options :
  - **« Tous les associés (vue globale) »** (défaut) → affiche le waterfall consolidé actuel (dividendes / CCA / total distribué pour 100 % du capital).
  - Une option par personne physique (`physicalAssociates`), libellée « Prénom Nom — Expl. X.X% / Fonc. Y.Y% ».
- Quand un associé est sélectionné, les barres affichent **sa quote-part** année par année, calculée comme :
  - `dividends = _sasDividends × pExp + _sciDividends × pFon`
  - `ccaRepayment = _sasCca × pExp + _sciCca × pFon`
  - `totalDistributed = dividends + ccaRepayment + (réserves × parts)` — réserves recalculées à partir du delta `_sasDividends`/`_sciDividends` vs `totalDistributed` global, ou plus simplement on n'affiche que `dividends` + `ccaRepayment` en mode individuel (la « réserve » n'est pas distribuée à l'associé). À choisir : je propose **dividendes + CCA uniquement** en vue individuelle (plus juste financièrement), et **ne pas montrer la barre `totalDistributed`** dans ce cas.
- Le titre du graphique passe à « Flux distribués à {nom} » quand un associé est sélectionné.

## État

- `useState<string>("__all__")` pour l'associé sélectionné (id ou `"__all__"`).
- `useMemo` qui dérive `chartData` à partir de `waterfall` + `economicOwnership` + sélection.

## Fichier touché

- `src/pages/ProjectionAssociesPage.tsx` uniquement. Aucune modification du moteur, des types, ni des autres pages.

## Points à confirmer

1. En vue individuelle, faut-il afficher **uniquement dividendes + CCA** (montants réellement perçus par l'associé), ou **garder la barre « cash distribué total »** au prorata (qui inclut la réserve, non perçue) ?
2. Veux-tu aussi voir les **dividendes nets après PFU** dans le graphique individuel (barre supplémentaire), ou rester sur les montants bruts comme la vue globale ?
