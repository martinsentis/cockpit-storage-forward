import { ProjectionHeader } from "@/components/ProjectionHeader";
import { ExitHypothesesPanel } from "@/components/ExitHypothesesPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users2 } from "lucide-react";

export default function ProjectionAssociesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projection associés</h1>

      <ProjectionHeader />
      <ExitHypothesesPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Résultats investisseurs
            <Badge variant="outline" className="ml-auto text-xs">À venir</Badge>
          </CardTitle>
          <CardDescription>
            Les calculs de flux distribués, remboursement CCA, dividendes et TRI
            seront alimentés par le moteur backend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p>Flux distribués</p>
              <p className="text-lg font-semibold text-foreground">—</p>
            </div>
            <div>
              <p>Remboursement CCA</p>
              <p className="text-lg font-semibold text-foreground">—</p>
            </div>
            <div>
              <p>Dividendes</p>
              <p className="text-lg font-semibold text-foreground">—</p>
            </div>
            <div>
              <p>TRI cash-flow</p>
              <p className="text-lg font-semibold text-foreground">—</p>
            </div>
            <div>
              <p>TRI avec valeur de sortie</p>
              <p className="text-lg font-semibold text-foreground">—</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
