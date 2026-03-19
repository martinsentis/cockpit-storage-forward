// TODO moteur financier
// Les indicateurs de point mort sont affichés uniquement à titre structurel.
// Toutes les valeurs seront calculées par le moteur financier.
// L'interface ne doit effectuer aucun calcul économique.

import { ProjectionHeader } from "@/components/ProjectionHeader";
import { ProjectionHorizonSlider } from "@/components/ProjectionHorizonSlider";
import { useScenario } from "@/contexts/ScenarioContext";
import { useEngine } from "@/hooks/useEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const generateMockData = (years: number) =>
  Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    revenue: 0,
    ebe: 0,
    netResult: 0,
    cash: 0,
    breakEvenRevenue: 0,
    sustainabilityRevenue: 0,
    breakEvenSurface: 0,
    sustainabilitySurface: 0,
    breakEvenOccupancy: 0,
    sustainabilityOccupancy: 0,
  }));

export default function ProjectionSocietesPage() {
  const { scenarioState } = useScenario();
  const projectionYears = Math.max(1, Math.ceil(scenarioState.horizonMonths / 12));
  const mockData = generateMockData(projectionYears);
  const engine = useEngine();

  return (
    <div className="flex gap-6">
      <ProjectionHorizonSlider />
      <div className="flex-1 space-y-6">
        <h1 className="text-2xl font-bold">Projection sociétés</h1>

        <ProjectionHeader />

        <Card className="border-yellow-500">
          <CardHeader><CardTitle className="text-sm">ENGINE STATUS (debug)</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>hasData: {String(!!engine)}</p>
            <p>keys: {Object.keys(engine || {}).join(", ")}</p>
          </CardContent>
        </Card>
        <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64">
          {JSON.stringify(engine, null, 2)}
        </pre>

        {/* Indicateurs par entité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Exploitation enrichie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exploitation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {["CA HT", "EBE", "Résultat net", "Trésorerie fin d'année", "Loyer versé à la foncière"].map((label) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">— €</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Point mort exploitation</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface louée</span>
                  <span className="font-medium">— m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taux de remplissage</span>
                  <span className="font-medium">— %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA correspondant</span>
                  <span className="font-medium">— €</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Point mort soutenabilité financière</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Surface louée</span>
                  <span className="font-medium">— m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taux de remplissage</span>
                  <span className="font-medium">— %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CA correspondant</span>
                  <span className="font-medium">— €</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Foncière */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foncière</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {["Loyers encaissés", "EBE", "Résultat net", "Trésorerie fin d'année", "Loyer reçu de l'exploitation"].map((label) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">— €</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" name="CA HT" fill="#3b82f6" />
                <Bar dataKey="ebe" name="EBE" fill="#22c55e" />
                <Bar dataKey="netResult" name="Résultat net" fill="#f97316" />
                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeDasharray="6 3"
                  label={{ value: "Seuil exploitation", position: "insideTopLeft", fill: "#ef4444", fontSize: 11 }}
                />
                <ReferenceLine
                  y={0}
                  stroke="#f97316"
                  strokeDasharray="6 3"
                  label={{ value: "Seuil soutenabilité", position: "insideBottomLeft", fill: "#f97316", fontSize: 11 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Trésorerie cumulée */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trésorerie cumulée</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cash" name="Trésorerie" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique Seuil de rentabilité */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seuil de rentabilité – exploitation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" name="CA exploitation" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="breakEvenRevenue" name="Seuil exploitation" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" />
                <Line type="monotone" dataKey="sustainabilityRevenue" name="Seuil soutenabilité" stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-4">
              Le point mort correspond au niveau de chiffre d'affaires nécessaire pour couvrir les charges de l'exploitation.
              Le seuil de soutenabilité inclut également les remboursements de dette et les contraintes de trésorerie.
            </p>
          </CardContent>
        </Card>

        {/* Tableau annuel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tableau annuel</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">EBE</TableHead>
                  <TableHead className="text-right">Résultat net</TableHead>
                  <TableHead className="text-right">Trésorerie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                    <TableCell className="text-right">0 €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
