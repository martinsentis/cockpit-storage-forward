import { useState } from "react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { BackendMonthlyResult } from "@/engine/useEngine";

const fmt = (v: number) => (v === 0 ? "—" : v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €");

interface Props {
  data?: BackendMonthlyResult[];
}

function buildSasRows(months: BackendMonthlyResult[]) {
  let prevCash = months[0]?.cashEnd ?? 0;
  return months.map((m, i) => {
    const cat = m.projectedByCategory ?? {};
    const revenue = cat["SAS_REVENUE"] ?? 0;
    const opex = Math.abs(cat["SAS_OPEX"] ?? 0);
    const rent = Math.abs(cat["SAS_RENT"] ?? 0);
    const interest = Math.abs(cat["SAS_EXP_DEBT_INTEREST"] ?? 0);
    const principal = Math.abs(cat["SAS_EXP_DEBT_PRINCIPAL"] ?? 0);
    const tax = Math.abs(cat["SAS_TAX"] ?? 0);
    const ebe = revenue - opex - rent;
    const resultatNet = ebe - interest - tax;
    const cfOp = ebe - tax;
    const debtService = interest + principal;
    const cfNet = m.cashEnd - (i === 0 ? 0 : prevCash);
    prevCash = m.cashEnd;
    return {
      mois: m.monthIndex + 1,
      revenus: revenue,
      charges: opex,
      ebe,
      amort: 0,
      resExpl: ebe,
      resNet: resultatNet,
      is: tax,
      cfOp,
      debtService,
      cfNet,
      hasWarning: (m.warnings ?? []).some((w) => w.includes("sas")),
    };
  });
}

function buildSciRows(months: BackendMonthlyResult[]) {
  let prevCash = months[0]?.sciCashEnd ?? 0;
  return months.map((m, i) => {
    const cat = m.projectedByCategory ?? {};
    const revenue = cat["SCI_RENT"] ?? 0;
    const interest = Math.abs(cat["SCI_DEBT_INTEREST"] ?? 0);
    const principal = Math.abs(cat["SCI_DEBT_PRINCIPAL"] ?? 0);
    const tax = Math.abs(cat["SCI_TAX"] ?? 0);
    const ebe = revenue;
    const resultatNet = ebe - interest - tax;
    const cfOp = ebe - tax;
    const debtService = interest + principal;
    const cfNet = m.sciCashEnd - (i === 0 ? 0 : prevCash);
    prevCash = m.sciCashEnd;
    return {
      mois: m.monthIndex + 1,
      revenus: revenue,
      charges: 0,
      ebe,
      amort: 0,
      resExpl: ebe,
      resNet: resultatNet,
      is: tax,
      cfOp,
      debtService,
      cfNet,
      hasWarning: (m.warnings ?? []).some((w) => w.includes("sci")),
    };
  });
}

const COLUMNS = [
  "Mois",
  "Revenus",
  "Charges",
  "EBE",
  "Amort.",
  "Rés. expl.",
  "Rés. net",
  "IS",
  "CF opérationnel",
  "Service dette",
  "CF net",
];

function PnLTable({ rows }: { rows: ReturnType<typeof buildSasRows> }) {
  const [limit, setLimit] = useState(24);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col} className="whitespace-nowrap text-xs">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row) => (
              <TableRow key={row.mois} className={row.hasWarning ? "bg-amber-50" : ""}>
                <TableCell className="font-medium">{row.mois}</TableCell>
                <TableCell className="text-right text-green-700">{fmt(row.revenus)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(row.charges)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(row.ebe)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{fmt(row.amort)}</TableCell>
                <TableCell className="text-right">{fmt(row.resExpl)}</TableCell>
                <TableCell className="text-right font-medium">{fmt(row.resNet)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(row.is)}</TableCell>
                <TableCell className="text-right">{fmt(row.cfOp)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(row.debtService)}</TableCell>
                <TableCell className={`text-right font-medium ${row.cfNet >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {fmt(row.cfNet)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > limit && (
        <button onClick={() => setLimit(rows.length)} className="text-xs text-muted-foreground underline">
          Afficher tous les {rows.length} mois
        </button>
      )}
    </div>
  );
}

export default function EngineMonthlyPnL({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Search className="h-5 w-5" />
        <span className="text-sm">En attente des données du moteur...</span>
      </div>
    );
  }

  const sasRows = buildSasRows(data);
  const sciRows = buildSciRows(data);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Exploitation (SAS)</h3>
        <PnLTable rows={sasRows} />
      </div>
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Foncière (SCI)</h3>
        <PnLTable rows={sciRows} />
      </div>
    </div>
  );
}
