import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DoorOpen } from "lucide-react";
import { useScenario } from "@/contexts/ScenarioContext";

export function ExitHypothesesPanel() {
  const { scenarioState, updateExitHypotheses } = useScenario();
  const exit = scenarioState.exitHypotheses;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DoorOpen className="h-5 w-5" />
          Hypothèses de sortie / exit
          <Badge variant="outline" className="ml-auto text-xs">Projection associés</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="exit-valuation">Valorisation foncière (€)</Label>
            <Input
              id="exit-valuation"
              type="number"
              min={0}
              value={exit.fonciereValuation}
              onChange={(e) => updateExitHypotheses({ fonciereValuation: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exit-multiple">Multiple d'EBE exploitation</Label>
            <Input
              id="exit-multiple"
              type="number"
              step={0.1}
              min={0}
              value={exit.exploitationEBEMultiple}
              onChange={(e) => updateExitHypotheses({ exploitationEBEMultiple: Number(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center gap-3 pt-5">
            <Switch
              id="exit-debt"
              checked={exit.repayDebtFirst}
              onCheckedChange={(v) => updateExitHypotheses({ repayDebtFirst: v })}
            />
            <Label htmlFor="exit-debt" className="cursor-pointer">
              Rembourser dettes avant dividendes
            </Label>
          </div>

          <div className="flex items-center gap-3 pt-5">
            <Switch
              id="exit-cca"
              checked={exit.repayCcaFirst}
              onCheckedChange={(v) => updateExitHypotheses({ repayCcaFirst: v })}
            />
            <Label htmlFor="exit-cca" className="cursor-pointer">
              Rembourser CCA avant dividendes
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
