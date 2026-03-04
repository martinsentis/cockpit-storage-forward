

# Plan : Synthèse fixe en haut + renommage EBE + ligne marge %

## Changements

### 1. Layout : Synthèse au-dessus des onglets
Déplacer le bloc `Card` "Synthèse" **avant** le composant `<Tabs>`, pour qu'il soit toujours visible en haut de la page.

### 2. Renommer "Résultat d'exploitation" → "EBE"
La dernière ligne du tableau affiche `CA Total - Gestionnaires - Charges` = c'est bien un EBE (Excédent Brut d'Exploitation). Renommer le label.

### 3. Ajouter une ligne "Marge EBE / CA"
Nouvelle ligne après l'EBE affichant `(EBE / CA Total) * 100` en pourcentage, pour les deux colonnes (100% et Cible).

## Fichier impacté

| Fichier | Action |
|---|---|
| `src/pages/ExploitationPage.tsx` | Déplacer synthèse avant `<Tabs>`, renommer en EBE, ajouter ligne marge % |

