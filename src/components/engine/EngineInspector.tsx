import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EngineMonthlyPnL from "./EngineMonthlyPnL";
import EngineFormulaInspector from "./EngineFormulaInspector";
import EngineLedgerView from "./EngineLedgerView";
import { useMonthlyResults } from "@/hooks/useEngine";

export default function EngineInspector() {
  const { data } = useMonthlyResults();
  const monthlyData = data ?? [];

  return (
    <Tabs defaultValue="pnl" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pnl">PNL mensuel</TabsTrigger>
        <TabsTrigger value="formulas">Explication des calculs</TabsTrigger>
        <TabsTrigger value="ledger">Ledger des flux</TabsTrigger>
      </TabsList>
      <TabsContent value="pnl">
        <EngineMonthlyPnL data={monthlyData} />
      </TabsContent>
      <TabsContent value="formulas">
        <EngineFormulaInspector data={monthlyData} />
      </TabsContent>
      <TabsContent value="ledger">
        <EngineLedgerView data={monthlyData} />
      </TabsContent>
    </Tabs>
  );
}
