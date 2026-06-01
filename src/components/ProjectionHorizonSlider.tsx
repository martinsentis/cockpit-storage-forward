import { useScenario } from "@/contexts/ScenarioContext";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "lucide-react";

const TICKS = [0, 5, 10, 15, 20, 25, 30];

export function ProjectionHorizonSlider() {
  const { scenarioState, updateScenarioField } = useScenario();
  const years = Math.max(0, Math.round(scenarioState.horizonMonths / 12));

  return (
    <div className="sticky top-20 flex-shrink-0 w-20 flex flex-col items-center gap-3 py-4 px-2 bg-muted/30 rounded-lg border border-border/50">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground [writing-mode:vertical-lr] rotate-180">
        Horizon
      </span>

      <div className="relative h-64 flex items-stretch gap-1.5 cursor-pointer">
        {/* Slider vertical avec piste visible */}
        <Slider
          orientation="vertical"
          min={0}
          max={30}
          step={1}
          value={[years]}
          onValueChange={([v]) => updateScenarioField("horizonMonths", v * 12)}
        />

        {/* Graduations */}
        <div className="relative h-full w-6 pointer-events-none">
          {TICKS.map((t) => {
            // Slider vertical : 0 en bas, 30 en haut
            const topPct = ((30 - t) / 30) * 100;
            return (
              <div
                key={t}
                className="absolute left-0 flex items-center gap-1 -translate-y-1/2"
                style={{ top: `${topPct}%` }}
              >
                <div className="w-1.5 h-px bg-border" />
                <span className="text-[9px] text-muted-foreground leading-none">
                  {t}a
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <span className="text-base font-bold text-foreground tabular-nums">
        {years}<span className="text-xs font-medium text-muted-foreground ml-0.5">ans</span>
      </span>
    </div>
  );
}
