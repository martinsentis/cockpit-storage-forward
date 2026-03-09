import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

interface Props {
  data?: any;
}

export default function EngineFormulaInspector({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Explication des calculs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Les explications de calcul apparaîtront ici lorsque le moteur sera connecté.
        </p>
      </CardContent>
    </Card>
  );
}
