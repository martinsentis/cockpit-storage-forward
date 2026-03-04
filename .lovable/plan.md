

# Plan : Navigation par blocs + bouton Enregistrer par bloc

## Problème

La page Exploitation (et les autres modules) est une longue page avec 5 blocs empilés verticalement. Le bouton "Enregistrer" est tout en bas, facile à oublier. Scroller pour naviguer entre les blocs est pénible.

## Solution

### 1. Créer un composant `BlockTabs` réutilisable

Un composant qui affiche des onglets horizontaux (ou verticaux sur grand écran) en haut du module. Un seul bloc est visible à la fois. L'utilisateur clique sur un onglet pour changer de bloc.

Utiliser le composant `Tabs` de shadcn/ui déjà disponible.

### 2. Refactorer `ExploitationPage.tsx`

Envelopper les 5 blocs dans un `Tabs` :
- **Capacité** (Phases de capacité)
- **Services**
- **Gestionnaires**
- **Charges**
- **Synthèse**

Chaque `TabsContent` contient le bloc correspondant (la Card actuelle). Le bouton "Enregistrer" est affiché **dans chaque onglet** (en bas du bloc visible), pas uniquement tout en bas de la page.

Structure :
```
<Tabs defaultValue="capacite">
  <TabsList>
    <TabsTrigger value="capacite">Capacité</TabsTrigger>
    <TabsTrigger value="services">Services</TabsTrigger>
    <TabsTrigger value="gestionnaires">Gestionnaires</TabsTrigger>
    <TabsTrigger value="charges">Charges</TabsTrigger>
    <TabsTrigger value="synthese">Synthèse</TabsTrigger>
  </TabsList>
  <TabsContent value="capacite">
    {/* Card Phases */}
    <Button onClick={save}>Enregistrer</Button>
  </TabsContent>
  {/* ... idem pour chaque bloc */}
</Tabs>
```

### 3. Appliquer le même pattern aux autres pages

Pour les pages simples (Projet, Build, Financement, Gouvernance) qui n'ont qu'un seul bloc, pas de changement nécessaire — le bouton est déjà visible. Si une page a plusieurs blocs (ex: Financement), appliquer le même pattern `Tabs`.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/pages/ExploitationPage.tsx` | Envelopper les 5 blocs dans `Tabs`, ajouter un bouton Enregistrer par onglet |
| `src/pages/FinancementPage.tsx` | Vérifier si multi-blocs, appliquer si nécessaire |

