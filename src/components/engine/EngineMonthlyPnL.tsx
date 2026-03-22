import { useState } from "react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";
import type { BackendMonthlyResult } from "@/hooks/useEngine";

const fmt = (v: number) => (v === 0 ? "—" : v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €");
const fmtPct = (v: number) => (v === 0 ? "—" : (v * 100).toFixed(1) + " %");

interface Props {
  data?: BackendMonthlyResult[];
}

// ── Lignes SAS ───────────────────────────────────────────────
function buildSasRows(months: BackendMonthlyResult[]) {
  let prevCash = months[0]?.cashEnd ?? 0;
  return months.map((m, i) => {
    const cat = m.projectedByCategory ?? {};
    const revenue = cat["SAS_REVENUE"] ?? 0;
    const opex = Math.abs(cat["SAS_OPEX"] ?? 0);
    const loyer = Math.abs(cat["SAS_RENT"] ?? 0);
    const totalCharges = opex + loyer;
    const interest = Math.abs(cat["SAS_EXP_DEBT_INTEREST"] ?? 0);
    const principal = Math.abs(cat["SAS_EXP_DEBT_PRINCIPAL"] ?? 0);
    const tax = Math.abs(cat["SAS_TAX"] ?? 0);
    const ebe = revenue - totalCharges;
    const debtService = interest + principal;
    const resNet = ebe - interest - tax;
    const cfNet = m.cashEnd - (i === 0 ? 0 : prevCash);

    const pctLoue = m.leasedSurfacePercent;

    prevCash = m.cashEnd;
    return {
      mois: m.monthIndex + 1,
      pctLoue,
      revenue,
      opex,
      loyer,
      totalCharges,
      ebe,
      tax,
      resNet,
      debtService,
      cfNet,
    };
  });
}

// ── Lignes SCI ───────────────────────────────────────────────
function buildSciRows(months: BackendMonthlyResult[]) {
  let prevCash = months[0]?.sciCashEnd ?? 0;
  return months.map((m, i) => {
    const cat = m.projectedByCategory ?? {};
    const loyer = cat["SCI_RENT"] ?? 0; // = SAS_RENT en valeur absolue
    const interest = Math.abs(cat["SCI_DEBT_INTEREST"] ?? 0);
    const principal = Math.abs(cat["SCI_DEBT_PRINCIPAL"] ?? 0);
    const insurance = Math.abs(cat["SCI_DEBT_INSURANCE"] ?? 0);
    const tax = Math.abs(cat["SCI_TAX"] ?? 0);
    const ebe = loyer - interest;
    const debtService = interest + principal + insurance;
    const resNet = ebe - tax;
    const amortissement = m.sciAmortization ?? 0;
    const cfNet = m.sciCashEnd - (i === 0 ? 0 : prevCash);
    prevCash = m.sciCashEnd;
    return {
      mois: m.monthIndex + 1,
      loyer,
      interest,
      amortissement,
      ebe,
      tax,
      resNet,
      debtService,
      cfNet,
    };
  });
}

// ── Table SAS ────────────────────────────────────────────────
function SasTable({ rows }: { rows: ReturnType<typeof buildSasRows> }) {
  const [limit, setLimit] = useState(24);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Mois</TableHead>
              <TableHead className="text-right text-blue-600">% Surf. louée</TableHead>
              <TableHead className="text-right">Revenus</TableHead>
              <TableHead className="text-right">Opex</TableHead>
              <TableHead className="text-right text-amber-600">Loyer SCI</TableHead>
              <TableHead className="text-right font-semibold">Total charges</TableHead>
              <TableHead className="text-right font-semibold">EBE</TableHead>
              <TableHead className="text-right">IS</TableHead>
              <TableHead className="text-right">Rés. net</TableHead>
              <TableHead className="text-right">Service dette</TableHead>
              <TableHead className="text-right">CF net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row) => (
              <TableRow key={row.mois}>
                <TableCell className="font-medium">{row.mois}</TableCell>

                {/* % surface louée */}
                <TableCell className="text-right">
                  <span
                    className={`font-medium ${
                      row.pctLoue == null || row.pctLoue === 0
                        ? "text-muted-foreground"
                        : row.pctLoue >= 0.8
                          ? "text-green-600"
                          : row.pctLoue >= 0.5
                            ? "text-amber-600"
                            : "text-red-500"
                    }`}
                  >
                    {row.pctLoue != null && row.pctLoue > 0 ? (row.pctLoue * 100).toFixed(1) + "%" : "—"}
                  </span>
                </TableCell>

                {/* Revenus */}
                <TableCell className="text-right text-green-700">{fmt(row.revenue)}</TableCell>

                {/* Opex */}
                <TableCell className="text-right text-red-500">{fmt(row.opex)}</TableCell>

                {/* Loyer SCI — colonne dédiée, fond amber léger */}
                <TableCell className="text-right bg-amber-50 text-amber-700 font-medium">{fmt(row.loyer)}</TableCell>

                {/* Total charges = opex + loyer */}
                <TableCell className="text-right text-red-600 font-semibold">{fmt(row.totalCharges)}</TableCell>

                {/* EBE */}
                <TableCell className={`text-right font-semibold ${row.ebe < 0 ? "text-red-600" : "text-foreground"}`}>
                  {fmt(row.ebe)}
                </TableCell>

                {/* IS */}
                <TableCell className="text-right text-red-500">{fmt(row.tax)}</TableCell>

                {/* Résultat net */}
                <TableCell className={`text-right ${row.resNet < 0 ? "text-red-600" : ""}`}>
                  {fmt(row.resNet)}
                </TableCell>

                {/* Service dette */}
                <TableCell className="text-right text-red-500">{fmt(row.debtService)}</TableCell>

                {/* CF net */}
                <TableCell className={`text-right font-medium ${row.cfNet < 0 ? "text-red-600" : "text-green-700"}`}>
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

// ── Table SCI ────────────────────────────────────────────────
function SciTable({ rows }: { rows: ReturnType<typeof buildSciRows> }) {
  const [limit, setLimit] = useState(24);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Mois</TableHead>
              <TableHead className="text-right text-amber-600 font-semibold">Loyer reçu</TableHead>
              <TableHead className="text-right text-red-600">Intérêts dette</TableHead>
              <TableHead className="text-right font-semibold">EBE</TableHead>
              <TableHead className="text-right">IS</TableHead>
              <TableHead className="text-right">Rés. net</TableHead>
              <TableHead className="text-right">Service dette</TableHead>
              <TableHead className="text-right">CF net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((row) => (
              <TableRow key={row.mois} className={row.cfNet < 0 ? "bg-red-50" : ""}>
                <TableCell className="font-medium">{row.mois}</TableCell>

                {/* Loyer reçu — même valeur que SAS, visuellement isolé */}
                <TableCell className="bg-amber-50 text-right">
                  <span className="font-semibold text-amber-700">{fmt(row.loyer)}</span>
                </TableCell>

                {/* Intérêts */}
                <TableCell className="text-right text-red-600">{fmt(row.interest)}</TableCell>

                {/* EBE */}
                <TableCell className={`text-right font-semibold ${row.ebe < 0 ? "text-red-600" : ""}`}>
                  {fmt(row.ebe)}
                </TableCell>

                {/* IS */}
                <TableCell className="text-right text-red-500">{fmt(row.tax)}</TableCell>

                {/* Résultat net */}
                <TableCell className={`text-right ${row.resNet < 0 ? "text-red-600" : ""}`}>
                  {fmt(row.resNet)}
                </TableCell>

                {/* Service dette */}
                <TableCell className="text-right text-red-500">{fmt(row.debtService)}</TableCell>

                {/* CF net */}
                <TableCell className={`text-right font-medium ${row.cfNet < 0 ? "text-red-600" : "text-green-700"}`}>
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

// ── Export principal ─────────────────────────────────────────
export default function EngineMonthlyPnL({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Search className="h-5 w-5" />
        <span className="text-sm">En attente des données du moteur...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Exploitation (SAS)</h3>
        <p className="text-xs text-muted-foreground">
          Le loyer SCI (<span className="text-amber-600 font-medium">en orange</span>) est la charge intra-groupe versée
          à la foncière. Le % surface louée est calculé par rapport au capacitaire total.
        </p>
        <SasTable rows={buildSasRows(data)} />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Foncière (SCI)</h3>
        <p className="text-xs text-muted-foreground">
          Le loyer reçu (<span className="text-amber-600 font-medium">en orange</span>) est le même flux que le loyer
          versé par la SAS — flux intra-groupe miroir. Les lignes en rouge indiquent les mois où la SCI consomme de la
          trésorerie.
        </p>
        <SciTable rows={buildSciRows(data)} />
      </div>
    </div>
  );
}
