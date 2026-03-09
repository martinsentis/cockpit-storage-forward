

## Plan : PNL mensuel multi-entités

### Modification unique

**`src/components/engine/EngineMonthlyPnL.tsx`** — Restructurer pour afficher deux sections empilées : "Exploitation" et "Foncière", chacune avec sa propre table PNL (mêmes colonnes). Le composant itère sur une liste d'entités `["Exploitation", "Foncière"]` et rend un titre + table par entité. Le Sheet reste unique et partagé.

### Fichiers

| Fichier | Action |
|---|---|
| `src/components/engine/EngineMonthlyPnL.tsx` | Modifier — deux sections par entité |

Aucun autre fichier modifié. Aucune logique métier ajoutée.

