

## Plan : Création automatique complète des objets de financement depuis le wizard

### Constat actuel
- Le `onFinalize` dans `ExploitationPage.tsx` ne crée des `DebtItem` que pour `DETTE_BANCAIRE` et `CREDIT_BAIL`
- Les sources `CCA` et `CAPITAL` ne créent rien dans le module Apports
- L'encart synthèse (step 6) ne couvre que les dettes bancaires
- `DebtItem` n'a pas de champs `id`, `type`, `phaseId`, `status` — il faut les ajouter
- `ApportItem` a déjà un `id`, `type`, `montant`, `statut` mais pas de `phaseId`

### Modifications

#### 1. `src/types/project.ts` — Enrichir les types

**DebtItem** — ajouter des champs optionnels pour tracer l'origine phase et le statut :
```ts
export interface DebtItem {
  id?: string;
  label: string;
  type?: "BANK_LOAN" | "LEASE";    // nouveau
  phaseId?: string;                 // nouveau
  amount: number;
  annualRate: number;
  durationMonths: number;
  deferralMonths: number;
  status?: "A_CONFIGURER" | "CONFIGURE";  // nouveau
}
```

**ApportItem** — ajouter `phaseId` et `status` optionnels :
```ts
export interface ApportItem {
  // champs existants...
  phaseId?: string;                 // nouveau
  status?: "A_CONFIGURER" | "CONFIGURE";  // nouveau
}
```

#### 2. `src/pages/ExploitationPage.tsx` — `onFinalize` étendu

Remplacer la logique actuelle (lignes 1137-1155) pour couvrir les 4 sources :

- **DETTE_BANCAIRE** → créer `DebtItem` avec `type: "BANK_LOAN"`, `label: "Crédit – Phase {nom}"`, `status: "A_CONFIGURER"` dans `financement.debts`
- **CREDIT_BAIL** → créer `DebtItem` avec `type: "LEASE"`, `label: "Crédit-bail – Phase {nom}"`, `status: "A_CONFIGURER"` dans `financement.debts`
- **CCA** → créer `ApportItem` avec `type: "CCA"`, `commentaire: "CCA – Phase {nom}"`, `status: "A_CONFIGURER"` dans `apports.apports`
- **CAPITAL** → créer `ApportItem` avec `type: "CAPITAL"`, `commentaire: "Apport capital – Phase {nom}"`, `status: "A_CONFIGURER"` dans `apports.apports`

Pour les `ApportItem`, utiliser `apporteurId: ""` et `beneficiaireId` basé sur `draft.entityPorteuse` (`__fonciere__` ou `__exploitation__`).

#### 3. `src/components/CapacityPhaseWizard.tsx` — Synthèse enrichie

Remplacer l'encart actuel (lignes 563-577) par un bloc qui liste **toutes** les sources non-trésorerie :

```tsx
{(() => {
  const itemsToCreate = draft.financing.filter(f => f.source !== "TRESORERIE");
  if (itemsToCreate.length === 0) return null;
  const labelMap = {
    DETTE_BANCAIRE: "Crédit bancaire",
    CREDIT_BAIL: "Crédit-bail",
    CCA: "Apport CCA",
    CAPITAL: "Apport capital",
  };
  const moduleMap = {
    DETTE_BANCAIRE: { label: "Module Financement", path: "/financement" },
    CREDIT_BAIL: { label: "Module Financement", path: "/financement" },
    CCA: { label: "Module Apports associés", path: "/apports" },
    CAPITAL: { label: "Module Apports associés", path: "/apports" },
  };
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 ...">
      <h4>Financements à compléter</h4>
      <ul>
        {itemsToCreate.map(f => (
          <li key={f.id}>
            {labelMap[f.source]} — {fmt(f.montant)} € → <Link to={moduleMap[f.source].path}>...</Link>
          </li>
        ))}
      </ul>
      <p>Les paramètres détaillés devront être complétés dans les modules dédiés.</p>
    </div>
  );
})()}
```

Passer `useNavigate` via une nouvelle prop `onNavigate?: (path: string) => void` pour que les liens de la synthèse puissent rediriger.

#### 4. `src/pages/FinancementPage.tsx` — Badge "À configurer"

Sur chaque `DebtItem` qui a `status === "A_CONFIGURER"` :
- Afficher un `<Badge variant="destructive">À configurer</Badge>` à côté du libellé

#### 5. `src/pages/ApportsPage.tsx` — Badge "À configurer"

Sur chaque `ApportItem` qui a `status === "A_CONFIGURER"` :
- Afficher un `<Badge variant="destructive">À configurer</Badge>` dans le tableau

### Résumé des fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/types/project.ts` | Champs `id`, `type`, `phaseId`, `status` sur `DebtItem` ; `phaseId`, `status` sur `ApportItem` |
| `src/pages/ExploitationPage.tsx` | `onFinalize` crée des objets pour les 4 sources |
| `src/components/CapacityPhaseWizard.tsx` | Synthèse liste toutes les sources avec liens vers modules |
| `src/pages/FinancementPage.tsx` | Badge "À configurer" sur les dettes auto-créées |
| `src/pages/ApportsPage.tsx` | Badge "À configurer" sur les apports auto-créés |

