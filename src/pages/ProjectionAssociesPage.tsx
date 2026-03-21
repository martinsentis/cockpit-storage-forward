import { ProjectionHeader } from "@/components/ProjectionHeader";
import { ProjectionHorizonSlider } from "@/components/ProjectionHorizonSlider";
import { useScenario } from "@/contexts/ScenarioContext";
import { useProject } from "@/contexts/ProjectContext";
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
import { useMonthlyResults } from "@/hooks/useEngine";
import type { BackendMonthlyResult } from "@/hooks/useEngine";

const fmt = (v: number) =>
  v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// ── Agrégation mensuelle → annuelle ──────────────────────────
function toYearlyWaterfall(months: BackendMonthlyResult[]) {
  const years = [];
  for (let y = 0; y < Math.ceil(months.length / 12); y++) {
    const slice  = months.slice(y * 12, y * 12 + 12);
    const last   = slice[slice.length - 1];
    const cat    = (m: BackendMonthlyResult) => m.projectedByCategory ?? {};

    const revenue    = slice.reduce((s, m) => s + (cat(m)["SAS_REVENUE"] ?? 0), 0);
    const opex       = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_OPEX"] ?? 0), 0);
    const rent       = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_RENT"] ?? 0), 0);
    const sasInterest = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_EXP_DEBT_INTEREST"] ?? 0), 0);
    const sasTax     = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_TAX"] ?? 0), 0);
    const sciRent    = slice.reduce((s, m) => s + (cat(m)["SCI_RENT"] ?? 0), 0);
    const sciInterest = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_DEBT_INTEREST"] ?? 0), 0);
    const sciTax     = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_TAX"] ?? 0), 0);

    const sasDividends  = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_DISTRIBUTION_DIVIDENDS"] ?? 0), 0);
    const sciDividends  = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_DISTRIBUTION_DIVIDENDS"] ?? 0), 0);
    const sasCca        = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_DISTRIBUTION_CCA"] ?? 0), 0);
    const sciCca        = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_DISTRIBUTION_CCA"] ?? 0), 0);
    const sasReserve    = slice.reduce((s, m) => s + Math.abs(cat(m)["SAS_DISTRIBUTION_RESERVE"] ?? 0), 0);
    const sciReserve    = slice.reduce((s, m) => s + Math.abs(cat(m)["SCI_DISTRIBUTION_RESERVE"] ?? 0), 0);

    const sasNetResult = (revenue - opex - rent) - sasInterest - sasTax;
    const sciNetResult = sciRent - sciInterest - sciTax;
    const dividends    = sasDividends + sciDividends;
    const ccaRepayment = sasCca + sciCca;
    const totalDistributed = dividends + ccaRepayment + sasReserve + sciReserve;

    years.push({
      year: y + 1,
      netResult:       Math.round(sasNetResult + sciNetResult),
      cashAvailable:   Math.round((last?.cashEnd ?? 0) + (last?.sciCashEnd ?? 0) + totalDistributed),
      dividends:       Math.round(dividends),
      ccaRepayment:    Math.round(ccaRepayment),
      totalDistributed: Math.round(totalDistributed),
      remainingCash:   Math.round((last?.cashEnd ?? 0) + (last?.sciCashEnd ?? 0)),
      // pour les fiches associés
      _sasDividends:   sasDividends,
      _sciDividends:   sciDividends,
      _sasCca:         sasCca,
      _sciCca:         sciCca,
    });
  }
  return years;
}

export default function ProjectionAssociesPage() {
  const { scenarioState, updateExitHypotheses } = useScenario();
  const { state } = useProject();
  const monthlyResults = useMonthlyResults();

  const projectionYears = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12));
  const { fonciereValuation, exploitationEBEMultiple, repayCcaFirst } = scenarioState.exitHypotheses;

  const physicalAssociates = state.associes.associes.filter((a) => a.type === "PHYSIQUE");
  const waterfall = toYearlyWaterfall(monthlyResults);

  // ── Valeur de sortie ─────────────────────────────────────────
  const lastMonth = monthlyResults[monthlyResults.length - 1];
  const lastYear  = waterfall[waterfall.length - 1];

  // EBE dernière année pour valorisation exploitation
  const lastYearMonths = monthlyResults.slice(-12);
  const cat = (m: BackendMonthlyResult) => m.projectedByCategory ?? {};
  const lastEbe = lastYearMonths.reduce((s, m) => {
    const rev  = cat(m)["SAS_REVENUE"] ?? 0;
    const opex = Math.abs(cat(m)["SAS_OPEX"] ?? 0);
    const rent = Math.abs(cat(m)["SAS_RENT"] ?? 0);
    return s + (rev - opex - rent);
  }, 0);

  const valorisationExploitation = lastEbe * exploitationEBEMultiple;
  const tresorerieExploitation   = lastMonth?.cashEnd ?? 0;
  const valorisationFonciere     = fonciereValuation;
  const tresorerieFonciere       = lastMonth?.sciCashEnd ?? 0;
  const totalEquity = valorisationExploitation + tresorerieExploitation + valorisationFonciere + tresorerieFonciere;

  // ── Totaux pour fiches associés ──────────────────────────────
  const totalSasDividends = waterfall.reduce((s, r) => s + r._sasDividends, 0);
  const totalSciDividends = waterfall.reduce((s, r) => s + r._sciDividends, 0);
  const totalSasCca       = waterfall.reduce((s, r) => s + r._sasCca, 0);
  const totalSciCca       = waterfall.reduce((s, r) => s + r._sciCca, 0);
  const dividendFlatTax   = state.fiscalite.dividendFlatTaxRate ?? 0.30;

  return (
    <div className="flex gap-6">
      <ProjectionHorizonSlider />
      <div className="flex-1 space-y-6">
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
                  value={fonciereValuation}
                  onChange={(e) => updateExitHypotheses({ fonciereValuation: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-multiple">Multiple EBE exploitation</Label>
                <Input
                  id="exit-multiple"
                  type="number"
                  step={0.1}
                  min={0}
                  value={exploitationEBEMultiple}
                  onChange={(e) => updateExitHypotheses({ exploitationEBEMultiple: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Checkbox
                  id="repay-cca"
                  checked={repayCcaFirst}
                  onCheckedChange={(v) => updateExitHypotheses({ repayCcaFirst: v === true })}
                />
                <Label htmlFor="repay-cca" className="cursor-pointer text-sm">
                  Rembourser les CCA avant distribution
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
              Horizon de projection : <span className="font-semibold text-foreground">{projectionYears} ans</span>
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

        {/* Section 3 — Graphique */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Flux distribués aux associés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={waterfall}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="dividends"      name="Dividendes"          fill="hsl(217, 91%, 60%)" />
                <Bar dataKey="ccaRepayment"   name="CCA remboursés"      fill="hsl(142, 71%, 45%)" />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source de valeur</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Valorisation exploitation (EBE × {exploitationEBEMultiple}x)</TableCell>
                  <TableCell className="text-right">{fmt(valorisationExploitation)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Trésorerie exploitation</TableCell>
                  <TableCell className="text-right">{fmt(tresorerieExploitation)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Valorisation foncière</TableCell>
                  <TableCell className="text-right">{fmt(valorisationFonciere)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Trésorerie foncière</TableCell>
                  <TableCell className="text-right">{fmt(tresorerieFonciere)}</TableCell>
                </TableRow>
                <TableRow className="font-semibold border-t-2">
                  <TableCell>Total valeur equity</TableCell>
                  <TableCell className="text-right">{fmt(totalEquity)}</TableCell>
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
          {physicalAssociates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Aucun associé personne physique configuré. Rendez-vous dans le module Associés pour en ajouter.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {physicalAssociates.map((inv) => {
                const pExp = inv.partExploitation;  // part dans SAS
                const pFon = inv.partFonciere;       // part dans SCI

                const ccaBrut     = totalSasCca * pExp + totalSciCca * pFon;
                const divBruts    = totalSasDividends * pExp + totalSciDividends * pFon;
                const divNets     = divBruts * (1 - dividendFlatTax);
                const exitExplVal = valorisationExploitation * pExp;
                const exitExplTre = tresorerieExploitation * pExp;
                const exitFonVal  = valorisationFonciere * pFon;
                const exitFonTre  = tresorerieFonciere * pFon;
                const cashTotalBrut = ccaBrut + divBruts + exitExplVal + exitExplTre + exitFonVal + exitFonTre;
                const cashTotalNet  = ccaBrut + divNets + exitExplVal + exitExplTre + exitFonVal + exitFonTre;

                return (
                  <Card key={inv.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        {inv.prenom ? `${inv.prenom} ${inv.nom}` : inv.nom}
                        <Badge variant="outline">
                          SAS {(pExp * 100).toFixed(0)}% / SCI {(pFon * 100).toFixed(0)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">RUN</p>
                        <div className="grid grid-cols-2 gap-y-1">
                          <span>CCA remboursé</span>
                          <span className="text-right">{fmt(ccaBrut)}</span>
                          <span>Dividendes bruts</span>
                          <span className="text-right">{fmt(divBruts)}</span>
                          <span>Dividendes nets (PFU {(dividendFlatTax * 100).toFixed(0)}%)</span>
                          <span className="text-right">{fmt(divNets)}</span>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">EXIT</p>
                        <div className="grid grid-cols-2 gap-y-1">
                          <span>Part valorisation exploitation</span>
                          <span className="text-right">{fmt(exitExplVal)}</span>
                          <span>Part trésorerie exploitation</span>
                          <span className="text-right">{fmt(exitExplTre)}</span>
                          <span>Part valorisation foncière</span>
                          <span className="text-right">{fmt(exitFonVal)}</span>
                          <span>Part trésorerie foncière</span>
                          <span className="text-right">{fmt(exitFonTre)}</span>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="font-semibold text-muted-foreground mb-1">SYNTHÈSE</p>
                        <div className="grid grid-cols-2 gap-y-1">
                          <span>Cash total brut</span>
                          <span className="text-right font-medium">{fmt(cashTotalBrut)}</span>
                          <span>Cash total net</span>
                          <span className="text-right font-medium">{fmt(cashTotalNet)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
