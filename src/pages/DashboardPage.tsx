import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { SectionName } from "@/types/project";
import ProjectTimeline from "@/components/ProjectTimeline";

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

  const complete = isProjectComplete();
  const missingSections = (Object.keys(validated) as SectionName[]).filter(k => !validated[k]);

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

          {/* TODO: simulation remplacée par moteur engine.ts */}
          <Button disabled className="w-full">
            Simulation non connectée
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            La simulation sera alimentée par le moteur de projection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
