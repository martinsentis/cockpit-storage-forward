import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import type { SectionName } from "@/types/project";
import ProjectTimeline from "@/components/ProjectTimeline";
import { useMonthlyResults } from "@/hooks/useEngine";
import type { BackendMonthlyResult } from "@/hooks/useEngine";

const SECTION_LABELS: Record<SectionName, string> = {
  projet: "Projet",
  build: "Build / CAPEX",
  financement: "Financement",
  exploitation: "Exploitation",
  fonciere: "Foncière (SCI)",
  loyerDynamique: "Loyer Dynamique",
  gouvernance: "Gouvernance",
  associes: "Associés & Sociétés",
  apports: "Apports associés",
  fiscalite: "Fiscalité",
};

export default function DashboardPage() {
  const { validated, isProjectComplete } = useProject();
  const { data: monthlyResults = [], isLoading, isError, error } = useMonthlyResults();

  const complete = isProjectComplete();
  const missingSections = (Object.keys(validated) as SectionName[]).filter(k => !validated[k]);
  const firstYear = monthlyResults.slice(0, 12);
  const cat = (m: BackendMonthlyResult) => m.projectedByCategory ?? {};
  const revenue = firstYear.reduce((s, m) => s + (cat(m)["SAS_REVENUE"] ?? 0), 0);
  const opex = firstYear.reduce((s, m) => s + Math.abs(cat(m)["SAS_OPEX"] ?? 0), 0);
  const rent = firstYear.reduce((s, m) => s + Math.abs(cat(m)["SAS_RENT"] ?? 0), 0);
  const lastMonth = monthlyResults[monthlyResults.length - 1];
  const avgDscrValues = firstYear.map((m) => m.dscr).filter((v) => v > 0);
  const avgDscr = avgDscrValues.length ? avgDscrValues.reduce((a, b) => a + b, 0) / avgDscrValues.length : 0;
  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";

  return (
    <div className="space-y-6 max-w-5xl">
      <ProjectTimeline />
      <Card>
        <CardHeader><CardTitle>Dashboard — Simulation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!complete && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Sections manquantes
              </div>
              <ul className="list-disc list-inside text-sm text-orange-700">
                {missingSections.map(s => (
                  <li key={s}>{SECTION_LABELS[s]}</li>
                ))}
              </ul>
            </div>
          )}

          {complete && (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Toutes les sections sont validées</span>
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Railway n'a pas renvoyé de projection. Aucune valeur locale ou factice n'est affichée.
                {error instanceof Error ? ` Détail : ${error.message}` : ""}
              </AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="flex items-center gap-3 rounded-md border bg-card p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calcul Railway en cours…
            </div>
          )}

          {!isLoading && !isError && monthlyResults.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Railway a répondu, mais sans données de projection exploitables.</AlertDescription>
            </Alert>
          )}

          {!isLoading && !isError && monthlyResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-md border bg-card p-4">
                <p className="text-sm text-muted-foreground">CA HT année 1</p>
                <p className="text-xl font-semibold">{fmt(revenue)}</p>
              </div>
              <div className="rounded-md border bg-card p-4">
                <p className="text-sm text-muted-foreground">EBE année 1</p>
                <p className="text-xl font-semibold">{fmt(revenue - opex - rent)}</p>
              </div>
              <div className="rounded-md border bg-card p-4">
                <p className="text-sm text-muted-foreground">Trésorerie fin projection</p>
                <p className="text-xl font-semibold">{fmt(lastMonth?.cashEnd ?? 0)}</p>
              </div>
              <div className="rounded-md border bg-card p-4">
                <p className="text-sm text-muted-foreground">DSCR moyen année 1</p>
                <p className="text-xl font-semibold">{avgDscr.toFixed(2)} x</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
