// TODO moteur financier
// Toutes les valeurs affichées sont des placeholders.
// Aucun calcul financier réel ne doit être implémenté ici.
// Les données seront remplacées lorsque le moteur sera connecté.

import { useState } from "react";
import { ProjectionHeader } from "@/components/ProjectionHeader";
import { useScenario } from "@/contexts/ScenarioContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { DoorOpen, TrendingUp, Users2, BarChart3 } from "lucide-react";

const mockInvestors = [
  { name: "Associé A", ownership: 0.40 },
  { name: "Associé B", ownership: 0.35 },
  { name: "Associé C", ownership: 0.25 },
];

const generateWaterfall = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    netResult: 0,
    cashAvailable: 0,
    dividends: 0,
    ccaRepayment: 0,
    totalDistributed: 0,
    remainingCash: 0,
  }));

const fmt = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function ProjectionAssociesPage() {
  const { scenarioState } = useScenario();
  const projectionHorizon = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12));

  const [exitValuation, setExitValuation] = useState(0);
  const [ebeMultiple, setEbeMultiple] = useState(0);
  const [repayCcaFirst, setRepayCcaFirst] = useState(false);

  const waterfall = generateWaterfall(projectionHorizon);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projection associés</h1>

      <ProjectionHeader />

      {/* Section 1 — Hypothèses de sortie */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DoorOpen className="h-5 w-5" />
            Hypothèses de sortie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La vente est simulée à l'année correspondant à l'horizon de projection sélectionné dans le curseur global.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exit-valuation">Valeur foncière (€)</Label>
              <Input
                id="exit-valuation"
                type="number"
                min={0}
                value={exitValuation}
                onChange={(e) => setExitValuation(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-multiple">Multiple EBE exploitation</Label>
              <Input
                id="exit-multiple"
                type="number"
                step={0.1}
                min={0}
                value={ebeMultiple}
                onChange={(e) => setEbeMultiple(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Checkbox
                id="repay-cca"
                checked={repayCcaFirst}
                onCheckedChange={(v) => setRepayCcaFirst(v === true)}
              />
              <Label htmlFor="repay-cca" className="cursor-pointer text-sm">
                Rembourser les comptes courants d'associés avant distribution
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Waterfall annuel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Waterfall des flux consolidés (exploitation + foncière)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Horizon de projection : <span className="font-semibold text-foreground">{projectionHorizon} ans</span>
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Année</TableHead>
                  <TableHead className="text-right">Résultat net total</TableHead>
                  <TableHead className="text-right">Cash disponible</TableHead>
                  <TableHead className="text-right">Dividendes</TableHead>
                  <TableHead className="text-right">CCA remboursés</TableHead>
                  <TableHead className="text-right">Cash distribué total</TableHead>
                  <TableHead className="text-right">Trésorerie restante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waterfall.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="text-right">{fmt(row.netResult)}</TableCell>
                    <TableCell className="text-right">{fmt(row.cashAvailable)}</TableCell>
                    <TableCell className="text-right">{fmt(row.dividends)}</TableCell>
                    <TableCell className="text-right">{fmt(row.ccaRepayment)}</TableCell>
                    <TableCell className="text-right">{fmt(row.totalDistributed)}</TableCell>
                    <TableCell className="text-right">{fmt(row.remainingCash)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Graphique flux associés */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Flux distribués aux associés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Flux consolidés provenant des deux sociétés (exploitation et foncière).
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfall}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="dividends" name="Dividendes" fill="hsl(217, 91%, 60%)" />
              <Bar dataKey="ccaRepayment" name="CCA remboursés" fill="hsl(142, 71%, 45%)" />
              <Bar dataKey="totalDistributed" name="Cash distribué total" fill="hsl(271, 91%, 65%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Section 4 — Valeur de sortie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DoorOpen className="h-5 w-5" />
            Décomposition de la valeur equity à la sortie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            La vente simulée correspond à la cession des deux sociétés (exploitation et foncière).
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source de valeur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                "Valorisation exploitation",
                "Trésorerie exploitation",
                "Valorisation foncière",
                "Trésorerie foncière",
              ].map((label) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right text-muted-foreground">— €</TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold border-t-2">
                <TableCell>Total valeur equity</TableCell>
                <TableCell className="text-right">— €</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 5 — Fiches associés */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Fiches associés (personnes physiques)
        </h2>
        <p className="text-sm text-muted-foreground">
          Participation agrégée directe et indirecte dans les deux sociétés (exploitation et foncière).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockInvestors.map((inv) => (
            <Card key={inv.name}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {inv.name}
                  <Badge variant="outline">{(inv.ownership * 100).toFixed(0)} %</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/* RUN */}
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">RUN</p>
                  <div className="grid grid-cols-2 gap-y-1">
                    <span>CCA remboursé</span><span className="text-right">— €</span>
                    <span>Dividendes bruts</span><span className="text-right">— €</span>
                    <span>Dividendes nets</span><span className="text-right">— €</span>
                  </div>
                </div>
                <Separator />
                {/* EXIT */}
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">EXIT</p>
                  <div className="grid grid-cols-2 gap-y-1">
                    <span>Part valorisation exploitation</span><span className="text-right">— €</span>
                    <span>Part trésorerie exploitation</span><span className="text-right">— €</span>
                    <span>Part valorisation foncière</span><span className="text-right">— €</span>
                    <span>Part trésorerie foncière</span><span className="text-right">— €</span>
                  </div>
                </div>
                <Separator />
                {/* SYNTHÈSE */}
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">SYNTHÈSE</p>
                  <div className="grid grid-cols-2 gap-y-1">
                    <span>Apport initial</span><span className="text-right">— €</span>
                    <span>Cash total brut</span><span className="text-right">— €</span>
                    <span>Cash total net</span><span className="text-right">— €</span>
                    <span>Multiple sur investissement</span><span className="text-right">— x</span>
                    <span>TRI brut</span><span className="text-right">— %</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
