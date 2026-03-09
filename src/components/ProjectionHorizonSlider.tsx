import { useScenario } from "@/contexts/ScenarioContext";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "lucide-react";

export function ProjectionHorizonSlider() {
  const { scenarioState, updateScenarioField } = useScenario();
  const years = Math.max(0, Math.round(scenarioState.horizonMonths / 12));

  return (
    <div className="sticky top-20 flex-shrink-0 w-16 flex flex-col items-center gap-3 py-4">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground tracking-tight [writing-mode:vertical-lr] rotate-180">
        Horizon
      </span>
      <div className="h-48">
        <Slider
          orientation="vertical"
          min={0}
          max={30}
          step={1}
          value={[years]}
          onValueChange={([v]) => updateScenarioField("horizonMonths", v * 12)}
          className="h-full"
        />
      </div>
      <span className="text-sm font-semibold text-foreground">{years} ans</span>
    </div>
  );
}
