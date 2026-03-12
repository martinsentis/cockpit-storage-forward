

## Diagnosis

There is **no CSP meta tag** in `index.html` and no CSP headers configured in `vite.config.ts`. The CSP restriction (`default-src 'none'`) is injected by the **Lovable preview iframe**, not by your app code.

## Plan

**File: `index.html`** — Add a CSP `<meta>` tag in `<head>` that explicitly allows connections to the Railway backend. This overrides the restrictive default.

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
    connect-src 'self' https://pilotagebox-production.up.railway.app https://*.lovableproject.com wss://*.lovableproject.com; 
    script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
    style-src 'self' 'unsafe-inline'; 
    img-src 'self' data: https:; 
    font-src 'self' data: https:;" />
```

Key directives:
- `connect-src` includes the Railway API domain **and** Lovable's own domains (for HMR/preview to keep working)
- `script-src` allows inline scripts and eval (needed by Vite dev mode)
- Other directives are permissive to avoid breaking existing functionality

**Single file change, no other modifications needed.**

**Important caveat:** If the CSP is enforced at the Lovable hosting/iframe level (HTTP header), a `<meta>` tag cannot relax it — it can only add further restrictions. In that case, the fix would be to use a proxy or configure the published domain's headers. We will try the meta tag first and verify.

