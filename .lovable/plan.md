

## Plan : Tunnel capacitaire atomique — compléments

Reprend le plan approuvé précédemment avec les 3 ajouts demandés.

### Modifications

#### 1. `src/types/project.ts`

- Ajouter `phaseId?: string` sur `CapexEvent` (déjà prévu)
- Ajouter `phaseId?: string` sur `BuildAsset`
- Ajouter `createdBy?: string` sur `CapexEvent`, `BuildAsset`, `DebtItem`, `ApportItem`

#### 2. `src/contexts/ProjectContext.tsx` — Opération atomique `batchUpdateSections`

Ajouter une nouvelle méthode au contexte :

```typescript
batchUpdateSections: (updates: Partial<{ [K in keyof ProjectState]: Partial<ProjectState[K]> }>) => void;
```

Cette méthode applique tous les patches en un seul `setState`, garantissant qu'aucun rendu intermédiaire ne produit un état incohérent (ex: dette sans CAPEX). L'implémentation fusionne chaque section dans un seul appel :

```typescript
const batchUpdateSections = useCallback((updates) => {
  setMultiState(prev => {
    const entry = prev.projects[prev.activeProjectId!];
    const newState = { ...entry.state };
    for (const [section, patch] of Object.entries(updates)) {
      newState[section] = { ...newState[section], ...patch };
    }
    return { ...prev, projects: { ...prev.projects, [prev.activeProjectId!]: { ...entry, state: newState } } };
  });
}, []);
```

#### 3. `src/pages/ExploitationPage.tsx` — Utiliser `batchUpdateSections` dans `onFinalize`

Remplacer les 4 appels `updateSection` séparés par un seul appel `batchUpdateSections` qui regroupe :
- `financement`: debts + sciDebts
- `apports`: apports
- `build`: capexEvents (avec `phaseId` et `createdBy: "capacity_phase"`)
- `exploitation`: phases mises à jour

Ajouter `createdBy: "capacity_phase"` sur tous les objets générés (debts, apports, assets, capexEvent).
Ajouter `phaseId: phaseData.id` sur les `BuildAsset` et le `CapexEvent`.

**Suppression cascade** : filtrer par `phaseId` sur toutes les collections (debts, sciDebts, apports, capexEvents et leurs assets internes). Utiliser `batchUpdateSections` pour la suppression aussi.

#### 4. `src/pages/FinancementPage.tsx` — Fusionner debts + sciDebts

Afficher les deux tableaux fusionnés. Router save/delete vers le bon tableau selon `entityId`.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/types/project.ts` | `phaseId` sur `CapexEvent` + `BuildAsset` ; `createdBy` sur 4 interfaces |
| `src/contexts/ProjectContext.tsx` | `batchUpdateSections` atomique |
| `src/pages/ExploitationPage.tsx` | Création atomique via batch ; suppression cascade avec AlertDialog |
| `src/pages/FinancementPage.tsx` | Fusionner debts + sciDebts ; router save/delete |
| `src/pages/FoncierePage.tsx` | Renommer "SCI" → "Foncière" |

