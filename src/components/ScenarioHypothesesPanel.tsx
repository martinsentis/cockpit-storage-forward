import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings2 } from "lucide-react";
import { useScenario } from "@/contexts/ScenarioContext";

export function ScenarioHypothesesPanel() {
  const { scenarioState, updateScenarioField } = useScenario();

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Hypothèses structurantes du scénario
          <Badge variant="outline" className="ml-auto text-xs">Scénario courant</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="scenario-horizon">Horizon de projection (mois)</Label>
            <Input
              id="scenario-horizon"
              type="number"
              min={1}
              value={scenarioState.horizonMonths}
              onChange={(e) => updateScenarioField("horizonMonths", Number(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scenario-indexation">Taux d'indexation annuel (%)</Label>
            <Input
              id="scenario-indexation"
              type="number"
              step={0.1}
              value={((scenarioState.indexationRate ?? 0) * 100).toFixed(1)}
              onChange={(e) => updateScenarioField("indexationRate", (Number(e.target.value) || 0) / 100)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scenario-occupancy">Taux de remplissage cible (%)</Label>
            <Input
              id="scenario-occupancy"
              type="number"
              step={1}
              placeholder="Par défaut (config)"
              value={scenarioState.targetOccupancy !== undefined ? (scenarioState.targetOccupancy * 100).toFixed(0) : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  updateScenarioField("targetOccupancy", undefined);
                } else {
                  updateScenarioField("targetOccupancy", (Number(v) || 0) / 100);
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scenario-rampup">Durée de ramp-up (mois)</Label>
            <Input
              id="scenario-rampup"
              type="number"
              min={0}
              placeholder="Par défaut (config)"
              value={scenarioState.rampUpMonths ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  updateScenarioField("rampUpMonths", undefined);
                } else {
                  updateScenarioField("rampUpMonths", Number(v) || 0);
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
