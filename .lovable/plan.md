

## Plan : Export / Import JSON sur la page d'accueil

### Fichiers modifiés : 2

**1. `src/contexts/ProjectContext.tsx`**
- Ajouter `importProject(entry: ProjectEntry): string` au contexte — insère un projet complet (meta + state + validated) dans le store avec un nouvel `id` et `createdAt` pour éviter les collisions, puis persiste dans localStorage.
- Ajouter `getProjectEntry(id: string): ProjectEntry | null` pour récupérer un projet complet à exporter.

**2. `src/pages/Index.tsx`**
- Ajouter deux boutons à côté de "Nouveau projet" :
  - **Exporter** (icône `Download`) : visible sur chaque carte projet (dans le hover, à côté de la corbeille). Clic → construit le JSON du `ProjectEntry`, crée un `Blob`, déclenche un téléchargement `projet-{nom}.json`.
  - **Importer** (icône `Upload`) : bouton global à côté de "Nouveau projet". Clic → ouvre un `<input type="file" accept=".json">` caché. À la sélection, lit le fichier via `FileReader`, parse le JSON, valide la structure minimale (présence de `meta`, `state`, `validated`), appelle `importProject`, puis navigue vers `/projet`.
- Toast de succès/erreur via `sonner`.

### Détail technique

Export d'un projet :
```typescript
function handleExport(id: string) {
  const entry = getProjectEntry(id);
  if (!entry) return;
  const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `projet-${entry.meta.nom}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Import : lecture fichier → `JSON.parse` → validation structure → `importProject` → toast + navigate.

