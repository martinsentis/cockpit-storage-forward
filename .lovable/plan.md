

## Plan : Brancher useEngine sur l'API backend avec stabilisation

### Fichiers modifies : 2

**1. `src/hooks/useEngine.ts`**

- Ajouter `fetchEngine` avec `AbortController` (timeout 8s)
- Importer `useQuery` depuis `@tanstack/react-query`
- Les 3 hooks (`useEngine`, `useEngineWithOverrides`, `useEngineWithScenario`) :
  - Construisent `inputs` comme aujourd'hui
  - Appellent `useQuery` avec `queryKey: ["engine", inputs]`, `staleTime: 10_000`, `initialData: computeEngine(inputs)`
  - Retournent `query.data` (jamais undefined grace a `initialData`)

```typescript
async function fetchEngine(inputs: EngineInputs): Promise<EngineOutputs> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const res = await fetch("http://localhost:3001/run-projection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) throw new Error("Engine API error");
  return res.json();
}
```

Chaque hook suit ce pattern :
```typescript
export function useEngine(): EngineOutputs {
  const { state } = useProject();
  const inputs = useMemo<EngineInputs>(() => ({
    projet: state.projet, build: state.build, /* ... 8 sections */
  }), [state]);

  const { data } = useQuery({
    queryKey: ["engine", inputs],
    queryFn: () => fetchEngine(inputs),
    initialData: computeEngine(inputs),
    staleTime: 10_000,
  });
  return data;
}
```

**2. `src/pages/LoyerDynamiquePage.tsx`**

- Remplacer l'import `computeEngine` par `useQuery` + `fetchEngine` (reexporte ou inline)
- Meme pattern : `useQuery` avec `queryKey: ["engine-loyer", inputs]`, `initialData: computeEngine(inputs)`, `staleTime: 10_000`
- `computeEngine` reste importe uniquement pour `initialData`

### Ce qui ne change pas
- UI, types, contexts, engine.ts, engineTypes.ts
- Signature des hooks (retournent toujours `EngineOutputs` synchrone)
- `computeEngine` reste le rendu initial instantane

