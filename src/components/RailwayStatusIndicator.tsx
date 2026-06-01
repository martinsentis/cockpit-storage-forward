import { useEffect, useState, useCallback } from "react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_URL } from "@/config";

type Status = "checking" | "online" | "offline";

const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 8_000;

async function pingHealth(): Promise<{ ok: boolean; latency: number }> {
  const start = performance.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal, cache: "no-store" });
    return { ok: res.ok, latency: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, latency: Math.round(performance.now() - start) };
  } finally {
    clearTimeout(t);
  }
}

export function RailwayStatusIndicator() {
  const [status, setStatus] = useState<Status>("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const fetchingEngine = useIsFetching({ queryKey: ["engine"] });
  const fetchingMonthly = useIsFetching({ queryKey: ["monthly-results"] });
  const isComputing = fetchingEngine + fetchingMonthly > 0;

  const check = useCallback(async () => {
    setStatus("checking");
    const { ok, latency } = await pingHealth();
    setStatus(ok ? "online" : "offline");
    setLatency(latency);
    setLastCheck(new Date());
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  const handleRefetch = useCallback(() => {
    check();
    queryClient.invalidateQueries({ queryKey: ["engine"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-results"] });
  }, [check, queryClient]);

  const dotColor =
    status === "online"
      ? "bg-emerald-500 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
      : status === "offline"
      ? "bg-destructive"
      : "bg-amber-500";

  const label =
    status === "online"
      ? `Railway en ligne${latency != null ? ` · ${latency}ms` : ""}`
      : status === "offline"
      ? "Railway hors ligne"
      : "Vérification…";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", dotColor)} />
      </span>
      <span className="text-xs font-medium text-foreground/80">
        {label}
        {isComputing && <span className="ml-1 text-muted-foreground">· calcul…</span>}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 rounded-full px-2.5 text-xs"
        onClick={handleRefetch}
        disabled={isComputing || status === "checking"}
        title={lastCheck ? `Dernier ping : ${lastCheck.toLocaleTimeString()}` : undefined}
      >
        {isComputing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Recalculer
      </Button>
    </div>
  );
}
