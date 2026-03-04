import { useProject } from "@/contexts/ProjectContext";
import { formatMonthIndex, monthLabel } from "@/lib/monthUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimelineEvent {
  monthIndex: number;
  label: string;
  category: "start" | "commercial" | "rampup" | "hiring" | "debt";
}

const CATEGORY_COLORS: Record<TimelineEvent["category"], string> = {
  start: "bg-blue-500",
  commercial: "bg-green-500",
  rampup: "bg-orange-500",
  hiring: "bg-violet-500",
  debt: "bg-red-500",
};

const CATEGORY_LABELS: Record<TimelineEvent["category"], string> = {
  start: "Début projet",
  commercial: "Début commercial",
  rampup: "Fin ramp-up",
  hiring: "Embauche",
  debt: "Dette",
};

export default function ProjectTimeline() {
  const { state } = useProject();
  const { horizonMonths, projectStartDate } = state.projet;
  const phases = state.exploitation.capacityPhases ?? [];
  const gestionnaires = state.exploitation.gestionnaires ?? [];
  const debts = state.financement.debts ?? [];

  // Build events
  const events: TimelineEvent[] = [
    { monthIndex: 0, label: "Début du projet", category: "start" },
  ];

  phases.forEach((p) => {
    events.push({ monthIndex: p.startMonth, label: `${p.nom} — Début commercial`, category: "commercial" });
    events.push({ monthIndex: p.startMonth + p.rampUpMonths, label: `${p.nom} — Cible ramp-up`, category: "rampup" });
  });

  gestionnaires.filter(g => g.actif).forEach((g) => {
    events.push({ monthIndex: g.dateDebutMois, label: `Embauche — ${g.nom}`, category: "hiring" });
  });

  debts.forEach((d) => {
    events.push({ monthIndex: d.deferralMonths, label: `Dette — ${d.label}`, category: "debt" });
  });

  const totalYears = Math.ceil(horizonMonths / 12);
  const TIMELINE_WIDTH = Math.max(800, totalYears * 120);

  const pct = (month: number) => `${(month / horizonMonths) * 100}%`;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Timeline du projet</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <span key={cat} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[cat as TimelineEvent["category"]]}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="relative" style={{ width: TIMELINE_WIDTH, height: 100 }}>
            {/* Main bar */}
            <div className="absolute top-[50px] left-0 right-0 h-[3px] bg-border rounded-full" />

            {/* Year ticks */}
            {Array.from({ length: totalYears + 1 }, (_, i) => {
              const month = i * 12;
              if (month > horizonMonths) return null;
              return (
                <div key={`y${i}`} className="absolute flex flex-col items-center" style={{ left: pct(month), transform: "translateX(-50%)" }}>
                  <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                    {i === 0 ? "Début" : `Année ${i}`}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70 whitespace-nowrap">
                    {formatMonthIndex(month, projectStartDate)}
                  </span>
                  <div className="w-px h-3 bg-border mt-0.5" />
                </div>
              );
            })}

            {/* 6-month secondary ticks */}
            {Array.from({ length: totalYears * 2 + 1 }, (_, i) => {
              const month = i * 6;
              if (month % 12 === 0 || month > horizonMonths) return null;
              return (
                <div key={`h${i}`} className="absolute" style={{ left: pct(month), top: 42, transform: "translateX(-50%)" }}>
                  <div className="w-px h-2 bg-border/60" />
                </div>
              );
            })}

            {/* Event markers */}
            {events.map((ev, idx) => (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <button
                    className={`absolute w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm cursor-default ${CATEGORY_COLORS[ev.category]} hover:scale-125 transition-transform`}
                    style={{ left: pct(ev.monthIndex), top: 44, transform: "translateX(-50%)" }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs space-y-0.5">
                  <p className="font-medium">{ev.label}</p>
                  <p className="text-muted-foreground">{monthLabel(ev.monthIndex, projectStartDate)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
