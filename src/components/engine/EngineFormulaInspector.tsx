import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import type { BackendMonthlyResult } from "@/engine/useEngine";

interface Props {
  data?: BackendMonthlyResult[];
}

const FORMULAS = [
  {
    titre: "EBE (Exploitation)",
    formule: "Revenus − Charges opex − Loyer SCI",
    note: "Earnings Before Interest, Taxes, Depreciation & Amortization. Mesure la rentabilité opérationnelle brute.",
  },
  {
    titre: "Résultat net SAS",
    formule: "EBE − Intérêts dette − IS",
    note: "Résultat après service financier et impôt sur les sociétés.",
  },
  {
    titre: "IS (Impôt sur les sociétés)",
    formule: "Barème progressif : 15% jusqu'à 42 500 € / 25% au-delà",
    note: "Calculé sur le RAI (Résultat Avant Impôt) cumulé de l'année, avec report de déficit.",
  },
  {
    titre: "Loyer SAS → SCI",
    formule: "Mode AUTONOMIE_SCI : Charges SCI + Intérêts + Principal + Assurance",
    note: "Le solveur calcule le loyer minimum pour que la SCI soit neutre en trésorerie chaque mois.",
  },
  {
    titre: "DSCR",
    formule: "EBE ÷ (Intérêts + Principal)",
    note: "Debt Service Coverage Ratio. Mesure la capacité à couvrir le service de la dette. Seuil cible ≥ 1.2.",
  },
  {
    titre: "Résultat net SCI",
    formule: "Loyer reçu − Intérêts SCI − IS SCI",
    note: "Le résultat SCI est généralement proche de zéro en mode AUTONOMIE_SCI.",
  },
  {
    titre: "Distribution (waterfall)",
    formule: "Cash disponible × taux distribuable → CCA → Réserve → Dividendes",
    note: "Déclenchée une fois par an (mois 12, 24, 36…). Bloquée si le forward stress test échoue.",
  },
];

export default function EngineFormulaInspector({ data }: Props) {
  const nbMois = data?.length ?? 0;

  return (
    <div className="space-y-4">
      {nbMois > 0 && (
        <p className="text-sm text-muted-foreground">
          Simulation active : <span className="font-medium text-foreground">{nbMois} mois</span> calculés.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORMULAS.map((f) => (
          <Card key={f.titre}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                {f.titre}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <code className="block text-xs bg-muted px-2 py-1 rounded font-mono">{f.formule}</code>
              <p className="text-xs text-muted-foreground">{f.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
