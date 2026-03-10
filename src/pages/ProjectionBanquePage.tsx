// TODO moteur financier
// Cet écran est une vue bancaire du scénario.
// Les valeurs affichées sont des placeholders.
// Les calculs réels (CAF, service de dette, DSCR, trésorerie) seront fournis par le moteur financier.
// Les financements créés ici deviendront des DebtItem dans le working state.

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
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer, ComposedChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";



const generateBankProjection = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    revenue: 0,
    ebe: 0,
    caf: 0,
    debtService: 0,
    dscr: 0,
    cashAfterDebt: 0,
    cash: 0,
  }));

export default function ProjectionBanquePage() {
  const { scenarioState } = useScenario();
  const projectionYears = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12));

  const [bankMode, setBankMode] = useState<"financing" | "monitoring">("financing");
  const [entity, setEntity] = useState<FinancingEntity>("FONCIERE");
  const [financingType, setFinancingType] = useState<DebtType>("BANK_LOAN");
  const [loanAmount, setLoanAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [loanDuration, setLoanDuration] = useState(0);
  const [gracePeriod, setGracePeriod] = useState(0);

  const data = generateBankProjection(projectionYears);

  return (
    <div className="flex gap-6">
      <ProjectionHorizonSlider />
      <div className="flex-1 space-y-6 p-6">
        <ProjectionHeader />

        {/* Mode switch */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Simulation financement</Label>
          <Switch
            checked={bankMode === "monitoring"}
            onCheckedChange={(v) => setBankMode(v ? "monitoring" : "financing")}
          />
          <Label className="text-sm font-medium">Suivi bancaire</Label>
        </div>

        {/* Hypothèses de financement */}
        {bankMode === "financing" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hypothèses de financement</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Entité porteuse</Label>
                <Select value={entity} onValueChange={(v) => setEntity(v as FinancingEntity)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(FINANCING_ENTITY_LABELS) as [FinancingEntity, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de financement</Label>
                <Select value={financingType} onValueChange={(v) => setFinancingType(v as DebtType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DEBT_TYPE_LABELS) as [DebtType, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
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
                <Input type="number" step="0.01" value={interestRate || ""} onChange={(e) => setInterestRate(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Durée (années)</Label>
                <Input type="number" value={loanDuration || ""} onChange={(e) => setLoanDuration(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Différé d'amortissement (années)</Label>
                <Input type="number" value={gracePeriod || ""} onChange={(e) => setGracePeriod(Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Résumé financement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé du financement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Annuité estimée</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service de la dette annuel</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capital restant dû final</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Les calculs seront fournis par le moteur financier.</p>
          </CardContent>
        </Card>

        {/* Soutenabilité bancaire */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Soutenabilité bancaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CAF</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Service de la dette</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DSCR</p>
                <p className="text-xl font-semibold">0 x</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trésorerie minimale</p>
                <p className="text-xl font-semibold">0 €</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Ces indicateurs permettent d'évaluer la capacité du projet à supporter son financement.
            </p>
          </CardContent>
        </Card>

        {/* Graphiques bancaires */}
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
                    <Tooltip />
                    <Bar dataKey="caf" name="CAF" fill="hsl(var(--primary))" />
                    <Line type="monotone" dataKey="debtService" name="Service dette" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
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
                    <Tooltip />
                    <Line type="monotone" dataKey="cash" name="Trésorerie" stroke="hsl(var(--accent-foreground))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau bancaire annuel */}
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
