import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProjectProvider } from "@/contexts/ProjectContext";
import Layout from "@/components/Layout";
import ProjetPage from "@/pages/ProjetPage";
import BuildPage from "@/pages/BuildPage";
import FinancementPage from "@/pages/FinancementPage";
import ExploitationPage from "@/pages/ExploitationPage";
import FoncierePage from "@/pages/FoncierePage";
import LoyerDynamiquePage from "@/pages/LoyerDynamiquePage";
import GouvernancePage from "@/pages/GouvernancePage";
import AssociesPage from "@/pages/AssociesPage";
import DashboardPage from "@/pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProjectProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/projet" replace />} />
              <Route path="/projet" element={<ProjetPage />} />
              <Route path="/build" element={<BuildPage />} />
              <Route path="/financement" element={<FinancementPage />} />
              <Route path="/exploitation" element={<ExploitationPage />} />
              <Route path="/fonciere" element={<FoncierePage />} />
              <Route path="/loyer-dynamique" element={<LoyerDynamiquePage />} />
              <Route path="/gouvernance" element={<GouvernancePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ProjectProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
