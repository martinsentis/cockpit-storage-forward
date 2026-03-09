import { ScenarioHypothesesPanel } from "@/components/ScenarioHypothesesPanel";
import { useEngineWithScenario } from "@/hooks/useEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import EngineInspector from "@/components/engine/EngineInspector";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

export default function ProjectionSocietesPage() {
  const { state } = useProject();
  const engine = useEngineWithScenario();
  const ex = engine.exploitation;
  const fo = engine.fonciere;
  const displayHT = state.projet.displayMode === "HT";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projection sociétés</h1>

      <ScenarioHypothesesPanel />

      <Tabs defaultValue="exploitation">
        <TabsList>
          <TabsTrigger value="exploitation">Exploitation (SAS)</TabsTrigger>
          <TabsTrigger value="fonciere">Foncière (SCI)</TabsTrigger>
          <TabsTrigger value="moteur">Détail moteur</TabsTrigger>
        </TabsList>

        <TabsContent value="exploitation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Compte de résultat
                <Badge variant="outline" className="text-xs">{displayHT ? "HT" : "TTC"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">CA Total</p>
                  <p className="text-lg font-semibold">{fmt(ex.caTotal)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CA {displayHT ? "HT" : "TTC"}</p>
                  <p className="text-lg font-semibold">{fmt(displayHT ? ex.totalCAHT : ex.totalCATTC)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Services (marge)</p>
                  <p className="text-lg font-semibold">{fmt(ex.margeServicesHT)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Charges totales</p>
                  <p className="text-lg font-semibold">{fmt(displayHT ? ex.totalChargesHT : ex.totalChargesTTC)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loyer SCI</p>
                  <p className="text-lg font-semibold">{fmt(ex.loyerSCI)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Résultat</p>
                  <p className={`text-lg font-semibold ${ex.resultat >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(ex.resultat)} €
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Surface totale</p>
                  <p className="text-lg font-semibold">{fmt(ex.totalSurface)} m²</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nombre de box</p>
                  <p className="text-lg font-semibold">{fmt(ex.totalNbBox)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prix moyen /m²</p>
                  <p className="text-lg font-semibold">{fmt(ex.prixM2Global)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taux d'occupation cible</p>
                  <p className="text-lg font-semibold">{(ex.targetOccupancyWeighted * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Marge services</p>
                  <p className="text-lg font-semibold">{(ex.margeServicesPct * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fonciere" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Compte de résultat SCI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Loyer mensuel HT</p>
                  <p className="text-lg font-semibold">{fmt(fo.loyerMensuelHT)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Autres revenus mensuels HT</p>
                  <p className="text-lg font-semibold">{fmt(fo.totalOtherRevenuesMensuellesHT)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenus mensuels HT</p>
                  <p className="text-lg font-semibold">{fmt(fo.totalRevenusMensuelHT)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Charges mensuelles HT</p>
                  <p className="text-lg font-semibold">{fmt(fo.totalChargesMensuellesHT)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Intérêts mensuels</p>
                  <p className="text-lg font-semibold">{fmt(fo.interetsMensuels)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Résultat courant</p>
                  <p className={`text-lg font-semibold ${fo.resultatCourant >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(fo.resultatCourant)} €
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ratios fiscaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amortissement annuel</p>
                  <p className="text-lg font-semibold">{fmt(fo.amortissementAnnuel)} €</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Résultat fiscal</p>
                  <p className="text-lg font-semibold">{fmt(fo.resultatFiscal)} €</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moteur" className="mt-4">
          <EngineInspector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
