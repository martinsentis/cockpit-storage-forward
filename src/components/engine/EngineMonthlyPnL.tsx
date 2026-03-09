import { useState } from "react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertTriangle, Search } from "lucide-react";

const COLUMNS = [
  "Mois", "Revenus", "Charges exploitation", "EBE", "Amortissements",
  "Résultat exploitation", "Résultat net", "IS provisionné",
  "Cash-flow opérationnel", "Service de dette", "Cash-flow net",
];

const ENTITIES = ["Exploitation", "Foncière"];

interface Props {
  data?: any;
  highlightedCells?: string[];
  onCellClick?: (cellId: string) => void;
}

export default function EngineMonthlyPnL({ data, highlightedCells = [], onCellClick }: Props) {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const handleCellClick = (cellId: string) => {
    if (highlightedCells.includes(cellId)) {
      setSelectedCell(cellId);
      onCellClick?.(cellId);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {ENTITIES.map((entity) => (
          <div key={entity} className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">{entity}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data && (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-5 w-5" />
                        <span>Le PNL mensuel de {entity} apparaîtra ici lorsque le moteur sera connecté.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>

      <Sheet open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Détail de la variation
            </SheetTitle>
            <SheetDescription>
              L'explication détaillée sera disponible lorsque le moteur sera connecté.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}
