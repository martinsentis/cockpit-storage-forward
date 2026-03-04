import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { API_URL } from "@/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
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
};

export default function DashboardPage() {
  const { validated, isProjectComplete, buildProjectionInputs } = useProject();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = isProjectComplete();

  const missingSections = (Object.keys(validated) as SectionName[]).filter(k => !validated[k]);

  const runSimulation = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const body = buildProjectionInputs();

    try {
      const res = await fetch(`${API_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(JSON.stringify(data, null, 2));
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

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

          <Button onClick={runSimulation} disabled={!complete || loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lancer la simulation
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive">Erreur</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto max-h-96 bg-muted p-4 rounded">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader><CardTitle>Résultat</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto max-h-96 bg-muted p-4 rounded">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
