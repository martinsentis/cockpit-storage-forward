import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import Layout from "@/components/Layout";
import Index from "@/pages/Index";
import ProjetPage from "@/pages/ProjetPage";
import BuildPage from "@/pages/BuildPage";
import FinancementPage from "@/pages/FinancementPage";
import ExploitationPage from "@/pages/ExploitationPage";
import FoncierePage from "@/pages/FoncierePage";
import LoyerDynamiquePage from "@/pages/LoyerDynamiquePage";
import GouvernancePage from "@/pages/GouvernancePage";
import FiscalitePage from "@/pages/FiscalitePage";
import AssociesPage from "@/pages/AssociesPage";
import ApportsPage from "@/pages/ApportsPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route element={<Layout />}>
              <Route path="/projet" element={<ProjetPage />} />
              <Route path="/build" element={<BuildPage />} />
              <Route path="/financement" element={<FinancementPage />} />
              <Route path="/exploitation" element={<ExploitationPage />} />
              <Route path="/fonciere" element={<FoncierePage />} />
              <Route path="/loyer-dynamique" element={<LoyerDynamiquePage />} />
              <Route path="/gouvernance" element={<GouvernancePage />} />
              <Route path="/fiscalite" element={<FiscalitePage />} />
              <Route path="/associes" element={<AssociesPage />} />
              <Route path="/apports" element={<ApportsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
