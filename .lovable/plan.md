

## Plan : 7 ajustements module Événements de trésorerie

### Fichiers modifiés

| Fichier | Ajustements |
|---|---|
| `src/types/project.ts` | 1, 2, 3 |
| `src/pages/EvenementsPage.tsx` | 2, 3, 4, 5, 6, 7 |

### Détail

**`src/types/project.ts`**

1. **Fréquence** : Remplacer `"JOURNALIER"` par `"HEBDOMADAIRE"` dans `TreasuryFrequency` et `TREASURY_FREQUENCY_LABELS` → liste finale : HEBDOMADAIRE, MENSUELLE, TRIMESTRIELLE, ANNUELLE
2. **createdAt** : Ajouter `createdAt: string` dans `TreasuryEvent`
3. **notes** : Ajouter `notes?: string` dans `TreasuryEvent`

**`src/pages/EvenementsPage.tsx`**

2. **createdAt** : Dans `handleSave`, ajouter `createdAt: new Date().toISOString()` à l'objet créé
3. **notes** : Ajouter un champ `Textarea` "Notes" (facultatif) dans le formulaire, col-span-2
4. **Probabilité** : Déjà à 100 dans `emptyEvent()` — vérifier (c'est le cas, rien à faire)
5. **TVA** : `tauxTVA` déjà initialisé à `0.20` dans `emptyEvent()` — rien à faire
6. **Sens du flux** : Dans la table, remplacer le texte brut par `↑ Entrée` (vert) / `↓ Sortie` (rouge) avec couleur
7. **Tri** : Trier `filtered` par `date` croissante avant affichage (`.sort((a, b) => a.date.localeCompare(b.date))`)

