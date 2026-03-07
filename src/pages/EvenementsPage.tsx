import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

export default function EvenementsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Événements de trésorerie</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Module à venir
          </CardTitle>
          <CardDescription>
            Cette page permettra de configurer les événements ponctuels de trésorerie :
            apports exceptionnels, retraits, versements planifiés, etc.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Le module sera connecté au moteur financier pour impacter les projections de cash-flow.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
