import { useState } from "react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { BackendMonthlyResult } from "@/hooks/useEngine";

interface Props {
  data?: BackendMonthlyResult[];
}

const LABEL: Record<string, string> = {
  SAS_REVENUE: "Revenus SAS",
  SAS_OPEX: "Charges exploitation SAS",
  SAS_RENT: "Loyer SAS → SCI",
  SAS_EXP_DEBT_INTEREST: "Intérêts dette SAS",
  SAS_EXP_DEBT_PRINCIPAL: "Principal dette SAS",
  SAS_EXP_DEBT_INSURANCE: "Assurance dette SAS",
  SAS_TAX: "IS SAS",
  SAS_DISTRIBUTION_DIVIDENDS: "Dividendes SAS",
  SAS_DISTRIBUTION_CCA: "Remboursement CCA SAS",
  SAS_DISTRIBUTION_RESERVE: "Réserve SAS",
  SCI_RENT: "Loyer reçu SCI",
  SCI_DEBT_INTEREST: "Intérêts dette SCI",
  SCI_DEBT_PRINCIPAL: "Principal dette SCI",
  SCI_DEBT_INSURANCE: "Assurance dette SCI",
  SCI_TAX: "IS SCI",
  SCI_DISTRIBUTION_DIVIDENDS: "Dividendes SCI",
  SCI_DISTRIBUTION_CCA: "Remboursement CCA SCI",
  SCI_DISTRIBUTION_RESERVE: "Réserve SCI",
};

const fmt = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function EngineLedgerView({ data }: Props) {
  const [limit, setLimit] = useState(100);

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Search className="h-5 w-5" />
        <span className="text-sm">En attente des données du moteur...</span>
      </div>
    );
  }

  // Déplie chaque mois en lignes de flux
  const rows: { mois: number; entite: string; type: string; montant: number }[] = [];
  for (const m of data) {
    const cat = m.projectedByCategory ?? {};
    for (const [key, amount] of Object.entries(cat)) {
      if (amount === 0) continue;
      rows.push({
        mois: m.monthIndex + 1,
        entite: key.startsWith("SCI") ? "Foncière" : "Exploitation",
        type: LABEL[key] ?? key,
        montant: amount,
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mois</TableHead>
              <TableHead>Entité</TableHead>
              <TableHead>Type de flux</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row, i) => (
              <TableRow key={i}>
                <TableCell>{row.mois}</TableCell>
                <TableCell>{row.entite}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell className={`text-right font-mono ${row.montant >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {fmt(row.montant)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > limit && (
        <button onClick={() => setLimit(rows.length)} className="text-xs text-muted-foreground underline">
          Afficher toutes les {rows.length} lignes
        </button>
      )}
    </div>
  );
}
