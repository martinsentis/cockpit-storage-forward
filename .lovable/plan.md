

## Plan : Ajouter `FinancialPolicySummary` au-dessus du simulateur

### Fichier impacté : `src/pages/GouvernancePage.tsx`

### Changement unique

Créer un composant `FinancialPolicySummary` inline (dans le même fichier) et l'insérer dans la colonne droite (ligne ~660), juste avant `<GouvernanceSimulator>`.

**Composant `FinancialPolicySummary`** :
- Reçoit `globalRule: GlobalGouvernanceRule` en props
- Carte avec fond différencié (`bg-muted/40` ou `bg-accent/10`)
- Titre : "Politique financière actuelle"
- Génère dynamiquement 3 lignes de texte :
  1. `"La distribution est limitée à {distributableCashRate×100} % du cash disponible, avec une réserve minimale de {fmt(minCashReserve)} €."`
  2. `"La priorité de distribution est : {allocationOrder mappé}."`  
     Mapping : `CCA_REPAYMENT` → "remboursement des comptes courants", `RESERVE` → "réserve stratégique", `DIVIDENDS` → "dividendes", séparés par " → "
  3. `"La protection dette (DSCR) est {activée/désactivée}."`
- Se met à jour automatiquement (lecture directe du state)

**Placement** (ligne ~660-662) :

```tsx
<div className="lg:col-span-2">
  <FinancialPolicySummary globalRule={form.globalRule} />
  <GouvernanceSimulator globalRule={form.globalRule} />
</div>
```

Avec un `space-y-4` ou `mb-4` pour l'espacement.

Aucun changement sur le modèle, la sauvegarde, le WaterfallEditor, l'EntityRuleCard ni l'onglet Historique.

