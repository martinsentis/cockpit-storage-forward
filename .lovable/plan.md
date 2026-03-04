

# Plan : Synthèse Exploitation en 2 colonnes (100% vs Cible)

## Changement

Transformer le bloc "Synthèse — Exploitation stabilisée" en un tableau à 2 colonnes de données :
- **Colonne 1 — "100% remplissage"** : CA Box et CA Services calculés à 100% d'occupation
- **Colonne 2 — "Occupation cible"** : CA Box et CA Services pondérés par le `targetOccupancy` moyen des phases

Les lignes de charges (gestionnaires, charges) restent identiques dans les deux colonnes (charges fixes). Le résultat d'exploitation diffère donc uniquement par le CA.

## Calculs dans `derived`

Ajouter :
- `targetOccupancyWeighted` : moyenne pondérée par surface des `targetOccupancy` de chaque phase
- `totalCAHT_cible = totalCAHT * targetOccupancyWeighted`
- `totalCATTC_cible = totalCATTC * targetOccupancyWeighted`
- `caServices_cible` : pour les services PAR_BOX et PAR_M2, pondérer par le taux cible
- `caTotal_cible`, `resultat_cible`

## UI

Remplacer la grille `grid-cols-2` par un mini-tableau (ou `grid-cols-3`) :

```
Ligne                  | 100% rempli  | Cible (XX%)
CA Box HT              |   xxx €      |   xxx €
CA Services            |   xxx €      |   xxx €
CA Total               |   xxx €      |   xxx €
Coût Gestionnaires     |  −xxx €      |  −xxx €
Charges HT             |  −xxx €      |  −xxx €
─────────────────────────────────────────────────
Résultat exploitation   |   xxx €      |   xxx €
```

## Fichier impacté

| Fichier | Action |
|---|---|
| `src/pages/ExploitationPage.tsx` | Enrichir `derived` avec les valeurs cible, refondre le bloc synthèse en 2 colonnes |

