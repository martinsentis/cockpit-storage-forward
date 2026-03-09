import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";

const COLUMNS = ["Date", "Entité", "Type de flux", "Description", "Montant"];

interface Props {
  data?: any;
}

export default function EngineLedgerView({ data }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((col) => (
            <TableHead key={col}>{col}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!data && (
          <TableRow>
            <TableCell colSpan={COLUMNS.length} className="h-32 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Search className="h-5 w-5" />
                <span>Le ledger des flux apparaîtra ici lorsque le moteur sera connecté.</span>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
