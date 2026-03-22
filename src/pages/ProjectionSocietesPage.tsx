import { ProjectionHeader } from "@/components/ProjectionHeader";
import { ProjectionHorizonSlider } from "@/components/ProjectionHorizonSlider";
import { useScenario } from "@/contexts/ScenarioContext";
import { useEngine, useMonthlyResults } from "@/hooks/useEngine";
import type { BackendMonthlyResult } from "@/hooks/useEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const fmtPct = (v: number) => (v * 100).toFixed(1) + " %";

// ── Agrégation mensuelle → annuelle ──────────────────────────
function toYearlyData(months: BackendMonthlyResult[]) {
  return Array.from({ length: Math.ceil(months.length / 12) }, (_, y) => {
    const slice = months.slice(y * 12, y * 12 + 12);
    const last = slice[slice.length - 1];
    const cat = (m: BackendMonthlyResult) => m.projectedByCategory ?? {};

    const revenue = slice.reduce((s, m) => s + (cat(m)["SAS_REVENUE"] ?? 0), 0);
    const opex = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_OPEX"] ?? 0), 0);
    const rent = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_RENT"] ?? 0), 0);
    const interest = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_EXP_DEBT_INTEREST"] ?? 0), 0);
    const principal = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_EXP_DEBT_PRINCIPAL"] ?? 0), 0);
    const tax = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_TAX"] ?? 0), 0);
    const sciRevenue = slice.reduce((s, m) => s + (cat(m)["SCI_RENT"] ?? 0), 0);
    const sciInterest = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_DEBT_INTEREST"] ?? 0), 0);
    const sciTax = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_TAX"] ?? 0), 0);

    const ebe = revenue - opex - rent;
    const debtService = interest + principal;
    const netResult = ebe - interest - tax;
    const sciNetResult = sciRevenue - sciInterest - sciTax;

    // Break-even : CA minimum pour EBE = 0
    const breakEvenRevenue = opex + rent;
    // Soutenabilité : CA minimum pour couvrir aussi le service de dette
    const sustainabilityRevenue = opex + rent + debtService;

    return {
      year: y + 1,
      revenue: Math.round(revenue),
      ebe: Math.round(ebe),
      netResult: Math.round(netResult),
      cash: Math.round(last?.cashEnd ?? 0),
      sciRevenue: Math.round(sciRevenue),
      sciNetResult: Math.round(sciNetResult),
      sciCash: Math.round(last?.sciCashEnd ?? 0),
      breakEvenRevenue: Math.round(breakEvenRevenue),
      sustainabilityRevenue: Math.round(sustainabilityRevenue),
      rent: Math.round(rent),
      debtService: Math.round(debtService),
      tax: Math.round(tax),
    };
  });
}

export default function ProjectionSocietesPage() {
  const { scenarioState } = useScenario();
  const engine = useEngine();
  const { data: monthlyResults = [] } = useMonthlyResults();

  const yearlyData = toYearlyData(monthlyResults);
  const lastYear = yearlyData[yearlyData.length - 1];
  const lastMonth = monthlyResults[monthlyResults.length - 1];

  // KPIs snapshot (dernière année)
  const totalSurface = engine?.exploitation?.totalSurface ?? 0;
  const prixM2 = engine?.exploitation?.prixM2Global ?? 0;

  const breakEvenRevenueMensuel = lastYear ? lastYear.breakEvenRevenue / 12 : 0;
  const sustainabilityRevenueMensuel = lastYear ? lastYear.sustainabilityRevenue / 12 : 0;
  const breakEvenSurface = prixM2 > 0 ? breakEvenRevenueMensuel / prixM2 : 0;
  const sustainabilitySurface = prixM2 > 0 ? sustainabilityRevenueMensuel / prixM2 : 0;
  const breakEvenOccupancy = totalSurface > 0 ? breakEvenSurface / totalSurface : 0;
  const sustainabilityOccupancy = totalSurface > 0 ? sustainabilitySurface / totalSurface : 0;

  return (
    <div className="flex gap-6">
      <ProjectionHorizonSlider />
      <div className="flex-1 space-y-6">
        <h1 className="text-2xl font-bold">Projection sociétés</h1>
        <ProjectionHeader />

        {/* Indicateurs par entité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Exploitation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exploitation (SAS)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  ["CA HT", fmt(lastYear?.revenue ?? 0)],
                  ["EBE", fmt(lastYear?.ebe ?? 0)],
                  ["Résultat net", fmt(lastYear?.netResult ?? 0)],
                  ["Trésorerie fin d'année", fmt(lastMonth?.cashEnd ?? 0)],
                  ["Loyer versé à la foncière", fmt(lastYear?.rent ?? 0)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Point mort exploitation (EBE = 0)</p>
                {[
                  ["Surface louée", `${Math.round(breakEvenSurface)} m²`],
                  ["Taux de remplissage", fmtPct(breakEvenOccupancy)],
                  ["CA correspondant", fmt(breakEvenRevenueMensuel) + "/mois"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Point mort soutenabilité (EBE ≥ service dette)</p>
                {[
                  ["Surface louée", `${Math.round(sustainabilitySurface)} m²`],
                  ["Taux de remplissage", fmtPct(sustainabilityOccupancy)],
                  ["CA correspondant", fmt(sustainabilityRevenueMensuel) + "/mois"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Foncière */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foncière (SCI)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {[
                  ["Loyers encaissés", fmt(lastYear?.sciRevenue ?? 0)],
                  ["EBE", fmt(lastYear?.sciRevenue ?? 0)],
                  ["Résultat net", fmt(lastYear?.sciNetResult ?? 0)],
                  ["Trésorerie fin d'année", fmt(lastMonth?.sciCashEnd ?? 0)],
                  ["Loyer reçu de l'exploitation", fmt(lastYear?.sciRevenue ?? 0)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance annuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" name="CA HT" fill="#3b82f6" />
                <Bar dataKey="ebe" name="EBE" fill="#22c55e" />
                <Bar dataKey="netResult" name="Résultat net" fill="#f97316" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Trésorerie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trésorerie cumulée</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="cash" name="SAS" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="sciCash" name="SCI" stroke="#06b6d4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Seuil de rentabilité */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seuil de rentabilité – exploitation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Line type="monotone" dataKey="revenue" name="CA exploitation" stroke="#3b82f6" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="breakEvenRevenue"
                  name="Seuil exploitation"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
                <Line
                  type="monotone"
                  dataKey="sustainabilityRevenue"
                  name="Seuil soutenabilité"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-4">
              Seuil exploitation = charges + loyer SCI. Seuil soutenabilité = charges + loyer + service de dette.
            </p>
          </CardContent>
        </Card>

        {/* Tableau annuel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tableau annuel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">EBE</TableHead>
                  <TableHead className="text-right">Résultat net</TableHead>
                  <TableHead className="text-right">Trésorerie SAS</TableHead>
                  <TableHead className="text-right">Trésorerie SCI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearlyData.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell className="text-right">{fmt(row.revenue)}</TableCell>
                    <TableCell className="text-right">{fmt(row.ebe)}</TableCell>
                    <TableCell className={`text-right ${row.netResult < 0 ? "text-red-600" : ""}`}>
                      {fmt(row.netResult)}
                    </TableCell>
                    <TableCell className="text-right">{fmt(row.cash)}</TableCell>
                    <TableCell className="text-right">{fmt(row.sciCash)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
