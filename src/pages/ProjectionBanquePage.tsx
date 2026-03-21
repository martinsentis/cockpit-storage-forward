import { useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { ProjectionHeader } from "@/components/ProjectionHeader";
import { ProjectionHorizonSlider } from "@/components/ProjectionHorizonSlider";
import type { DebtType, FinancingEntity } from "@/types/project";
import { DEBT_TYPE_LABELS, FINANCING_ENTITY_LABELS } from "@/types/project";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
} from "recharts";
import { useMonthlyResults } from "@/hooks/useEngine";
import type { BackendMonthlyResult } from "@/hooks/useEngine";

// Agrège les données mensuelles en années
function toYearlyData(months: BackendMonthlyResult[]) {
  const years: {
    year: number;
    revenue: number;
    ebe: number;
    caf: number;
    debtService: number;
    dscr: number;
    cashAfterDebt: number;
    cash: number;
  }[] = [];

  for (let y = 0; y < Math.ceil(months.length / 12); y++) {
    const slice = months.slice(y * 12, y * 12 + 12);
    const last = slice[slice.length - 1];
    const cat = (m: BackendMonthlyResult) => m.projectedByCategory ?? {};

    const revenue = slice.reduce((s, m) => s + (cat(m)["SAS_REVENUE"] ?? 0), 0);
    const opex = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_OPEX"] ?? 0), 0);
    const rent = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_RENT"] ?? 0), 0);
    const tax = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_TAX"] ?? 0), 0);
    const dInterest = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_EXP_DEBT_INTEREST"] ?? 0), 0);
    const dPrincipal = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_EXP_DEBT_PRINCIPAL"] ?? 0), 0);

    const ebe = revenue - opex - rent;
    const caf = ebe - tax;
    const debtService = dInterest + dPrincipal;
    const dscrValues = slice.map((m) => m.dscr).filter((d) => d > 0);
    const dscr = dscrValues.length > 0 ? dscrValues.reduce((a, b) => a + b, 0) / dscrValues.length : 0;

    years.push({
      year: y + 1,
      revenue: Math.round(revenue),
      ebe: Math.round(ebe),
      caf: Math.round(caf),
      debtService: Math.round(debtService),
      dscr: Math.round(dscr * 100) / 100,
      cashAfterDebt: Math.round(caf - debtService),
      cash: Math.round(last?.cashEnd ?? 0),
    });
  }
  return years;
}

export default function ProjectionBanquePage() {
  const { scenarioState } = useScenario();
  const monthlyResults = useMonthlyResults();
  const [bankMode, setBankMode] = useState<"financing" | "monitoring">("financing");
  const [entity, setEntity] = useState<FinancingEntity>("FONCIERE");
  const [financingType, setFinancingType] = useState<DebtType>("BANK_LOAN");
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [loanDuration, setLoanDuration] = useState(0);
  const [gracePeriod, setGracePeriod] = useState(0);

  const data = toYearlyData(monthlyResults);

  // KPIs résumé (moyenne sur toute la projection)
  const avgDscr =
    data.length > 0 ? data.reduce((s, r) => s + r.dscr, 0) / data.filter((r) => r.dscr > 0).length || 0 : 0;
  const totalCaf = data.reduce((s, r) => s + r.caf, 0);
  const totalDebtService = data.reduce((s, r) => s + r.debtService, 0);
  const minCash = data.length > 0 ? Math.min(...data.map((r) => r.cash)) : 0;

  return (
    <div className="flex gap-6">
      <ProjectionHorizonSlider />
      <div className="flex-1 space-y-6 p-6">
        <ProjectionHeader />
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Simulation financement</Label>
          <Switch
            checked={bankMode === "monitoring"}
            onCheckedChange={(v) => setBankMode(v ? "monitoring" : "financing")}
          />
          <Label className="text-sm font-medium">Suivi bancaire</Label>
        </div>

        {bankMode === "financing" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hypothèses de financement</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Entité porteuse</Label>
                <Select value={entity} onValueChange={(v) => setEntity(v as FinancingEntity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FINANCING_ENTITY_LABELS) as [FinancingEntity, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de financement</Label>
                <Select value={financingType} onValueChange={(v) => setFinancingType(v as DebtType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DEBT_TYPE_LABELS) as [DebtType, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Montant financé (€)</Label>
                <Input type="number" value={loanAmount || ""} onChange={(e) => setLoanAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Taux d'intérêt annuel (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={interestRate || ""}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Durée (années)</Label>
                <Input
                  type="number"
                  value={loanDuration || ""}
                  onChange={(e) => setLoanDuration(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Différé d'amortissement (années)</Label>
                <Input
                  type="number"
                  value={gracePeriod || ""}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Soutenabilité bancaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CAF totale</p>
                <p className="text-xl font-semibold">{totalCaf.toLocaleString()} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service de la dette total</p>
                <p className="text-xl font-semibold">{totalDebtService.toLocaleString()} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DSCR moyen</p>
                <p className="text-xl font-semibold">{avgDscr.toFixed(2)} x</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trésorerie minimale</p>
                <p className="text-xl font-semibold">{minCash.toLocaleString()} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Graphiques bancaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium mb-2">CAF vs Service de la dette</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => v.toLocaleString() + " €"} />
                    <Bar dataKey="caf" name="CAF" fill="hsl(var(--primary))" />
                    <Line
                      type="monotone"
                      dataKey="debtService"
                      name="Service dette"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">DSCR</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="dscr" name="DSCR" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Trésorerie projetée</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => v.toLocaleString() + " €"} />
                    <Line
                      type="monotone"
                      dataKey="cash"
                      name="Trésorerie"
                      stroke="hsl(var(--accent-foreground))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tableau bancaire annuel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">EBE</TableHead>
                  <TableHead className="text-right">CAF</TableHead>
                  <TableHead className="text-right">Service dette</TableHead>
                  <TableHead className="text-right">DSCR</TableHead>
                  <TableHead className="text-right">Cash après dette</TableHead>
                  <TableHead className="text-right">Trésorerie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell className="text-right">{row.revenue.toLocaleString()} €</TableCell>
                    <TableCell className="text-right">{row.ebe.toLocaleString()} €</TableCell>
                    <TableCell className="text-right">{row.caf.toLocaleString()} €</TableCell>
                    <TableCell className="text-right">{row.debtService.toLocaleString()} €</TableCell>
                    <TableCell className="text-right">{row.dscr.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.cashAfterDebt.toLocaleString()} €</TableCell>
                    <TableCell className="text-right">{row.cash.toLocaleString()} €</TableCell>
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
