

# Plan : Synthèse mensuelle + annuelle

## Approche retenue : table unique avec en-têtes groupés

Une seule table avec 4 colonnes de données, regroupées sous 2 en-têtes de groupe :

```text
                     │  Mensuel HT          │  Annuel HT           │
                     │ 100%    │ XX% louée  │ 100%     │ XX% louée │
─────────────────────┼─────────┼────────────┼──────────┼───────────┤
CA Box HT            │   ...   │    ...     │   ...    │    ...    │
CA Services HT       │   ...   │    ...     │   ...    │    ...    │
CA Total             │   ...   │    ...     │   ...    │    ...    │
Coût Gestionnaires   │  −...   │   −...     │  −...    │   −...    │
Charges HT           │  −...   │   −...     │  −...    │   −...    │
EBE                  │   ...   │    ...     │   ...    │    ...    │
Marge EBE / CA       │  X.X %  │   X.X %   │  X.X %   │   X.X %  │
```

Les colonnes annuelles = valeurs mensuelles × 12 (sauf la marge % qui reste identique).

Le titre devient **"Synthèse — Exploitation stabilisée"** (sans mention mensuel/annuel puisque les deux sont dans la table).

## Fichier impacté

| Fichier | Action |
|---|---|
| `src/pages/ExploitationPage.tsx` | Refactorer le tableau synthèse : 2 groupes de colonnes (mensuel/annuel), ajouter les valeurs ×12 |

