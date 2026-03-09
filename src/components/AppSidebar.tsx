import {
  Building2, Hammer, Landmark, TrendingUp, Users, Users2, LayoutDashboard,
  CheckCircle, AlertTriangle, Home, ArrowLeftRight, Wallet, Receipt, FolderOpen,
  CalendarClock, LineChart, UserCheck, Cog,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import type { SectionName } from "@/types/project";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const configSections: { title: string; url: string; icon: React.ElementType; section?: SectionName }[] = [
  { title: "Projet", url: "/projet", icon: Building2, section: "projet" },
  { title: "Associés & Sociétés", url: "/associes", icon: Users2, section: "associes" },
  { title: "Apports associés", url: "/apports", icon: Wallet, section: "apports" },
  { title: "Build", url: "/build", icon: Hammer, section: "build" },
  { title: "Financement", url: "/financement", icon: Landmark, section: "financement" },
  { title: "Exploitation", url: "/exploitation", icon: TrendingUp, section: "exploitation" },
  { title: "Foncière", url: "/fonciere", icon: Home, section: "fonciere" },
  { title: "Loyer dynamique", url: "/loyer-dynamique", icon: ArrowLeftRight, section: "loyerDynamique" },
  { title: "Fiscalité", url: "/fiscalite", icon: Receipt, section: "fiscalite" },
  { title: "Gouvernance", url: "/gouvernance", icon: Users, section: "gouvernance" },
  { title: "Événements de trésorerie", url: "/evenements", icon: CalendarClock },
];

const projectionSections: { title: string; url: string; icon: React.ElementType }[] = [
  { title: "Projection sociétés", url: "/projection-societes", icon: LineChart },
  { title: "Projection associés", url: "/projection-associes", icon: UserCheck },
  { title: "Projection banque", url: "/projection-banque", icon: Landmark },
  { title: "Détail moteur", url: "/detail-moteur", icon: Cog },
];

const pilotageSections: { title: string; url: string; icon: React.ElementType }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const navigate = useNavigate();
  const { validated, activeProjectMeta, hasActiveProject } = useProject();

  const renderItem = (item: { title: string; url: string; icon: React.ElementType; section?: SectionName }, showValidation: boolean) => {
    const isValidated = showValidation && item.section ? validated[item.section] : undefined;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span className="flex-1">{item.title}</span>}
            {!collapsed && isValidated !== undefined && (
              isValidated
                ? <CheckCircle className="h-4 w-4 text-green-500" />
                : <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Project selector */}
        <SidebarGroup>
          <SidebarGroupLabel>Projet actif</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {!collapsed && (
                    <span className="flex-1 truncate text-sm font-medium">
                      {hasActiveProject && activeProjectMeta ? activeProjectMeta.nom : "Sélectionner un projet"}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasActiveProject && (
          <>
            {/* Configuration */}
            <SidebarGroup>
              <SidebarGroupLabel>Configuration du projet</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {configSections.map((item) => renderItem(item, true))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Projections */}
            <SidebarGroup>
              <SidebarGroupLabel>Projections</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projectionSections.map((item) => renderItem(item, false))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Pilotage */}
            <SidebarGroup>
              <SidebarGroupLabel>Pilotage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pilotageSections.map((item) => renderItem(item, false))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
