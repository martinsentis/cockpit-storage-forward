

## Plan: Switch engine backend URL to localhost

**File**: `src/hooks/useEngine.ts`

**Change**: Replace the fetch URL on the single line where it appears:
- From: `"https://pilotagebox-production.up.railway.app/run-projection"`
- To: `"http://localhost:3001/run-projection"`

No other changes.

