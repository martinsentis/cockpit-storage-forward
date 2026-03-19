

## Plan: Activate engine on ProjectionSocietesPage with debug

`useEngine()` returns `EngineOutputs` directly (not a query object — no `.isLoading`). The debug block needs to reflect this: show keys and JSON of the returned object.

### Changes to `src/pages/ProjectionSocietesPage.tsx`

**1. Add import (after line 8):**
```ts
import { useEngine } from "@/hooks/useEngine";
```

**2. Add hook call (after line 50, inside component):**
```ts
const engine = useEngine();
```

**3. Add debug blocks in JSX (after `<ProjectionHeader />`, ~line 58):**
```tsx
<Card className="border-yellow-500">
  <CardHeader><CardTitle className="text-sm">ENGINE STATUS (debug)</CardTitle></CardHeader>
  <CardContent className="text-xs space-y-1">
    <p>hasData: {String(!!engine)}</p>
    <p>keys: {Object.keys(engine || {}).join(", ")}</p>
  </CardContent>
</Card>
<pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64">
  {JSON.stringify(engine, null, 2)}
</pre>
```

Note: `isLoading` is not available since `useEngine()` destructures only `data` from `useQuery`. The debug shows `hasData` and object keys instead, which confirms the backend responded.

No other changes.

