## Problème

Sur `/projection-societes`, le composant `ProjectionHorizonSlider` (colonne de gauche, sticky) affiche un curseur (thumb) qui paraît « flotter dans le vide » : la piste verticale du Slider shadcn n'est pas stylée pour l'orientation `vertical`, donc aucune ligne ne matérialise la course du curseur.

En plus, l'ensemble manque de présence visuelle pour qu'on comprenne que c'est interactif.

## Fichier modifié

- `src/components/ProjectionHorizonSlider.tsx` uniquement (pas de logique métier touchée).

## Changements

1. **Piste verticale visible** : passer une `trackClassName` / styles explicites au composant `Slider` pour forcer en mode vertical :
   - Track : `w-1.5 h-full` (au lieu du défaut horizontal `h-2 w-full`), couleur `bg-border`, arrondie.
   - Range (partie remplie) : `w-full` vertical, couleur `bg-primary`.
   - Thumb : conserver taille actuelle, ajouter un léger `ring`/`shadow` pour mieux le distinguer.

2. **Graduations** : ajouter à droite de la piste de petits tirets pour 0, 5, 10, 15, 20, 25, 30 ans + label `5a`, `10a`, `15a`… discret en `text-[10px] text-muted-foreground`. Ça donne un repère visuel et confirme la nature interactive.

3. **Affordance** : 
   - Cursor `cursor-pointer` sur la zone.
   - Label « Horizon » en haut + valeur en gros chiffres en bas (déjà présent, on renforce le contraste : `text-foreground font-bold`).
   - Légère bordure / background `bg-muted/30 rounded-lg` autour de la colonne pour la détacher du contenu et signifier qu'elle est une commande.

4. **Hauteur** : passer la piste de `h-48` à `h-64` pour avoir plus de place et rendre la course du curseur plus généreuse.

## Détails techniques

Le composant `Slider` de shadcn (`src/components/ui/slider.tsx`) accepte `orientation="vertical"` mais ses classes Tailwind par défaut sont écrites pour l'horizontal. Plutôt que modifier le composant UI partagé (risque de casser d'autres usages), on surcharge via `className` sur le `<Slider>` et via les data-attributes `[&_[data-orientation=vertical]]:...` pour cibler la track et le range en mode vertical. Cela reste local au composant.

Aucun changement aux types, contextes, ou logique scenario.

## Validation

- Vérifier que le track vertical est visible (ligne grise verticale).
- Vérifier que la partie sous le thumb se remplit en couleur primaire.
- Vérifier que glisser le thumb met bien à jour `horizonMonths` (logique inchangée).
- Vérifier l'aspect en sticky lors du scroll sur les pages `/projection-*`.
