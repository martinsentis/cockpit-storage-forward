import {
  Building2, Hammer, Landmark, TrendingUp, Users, LayoutDashboard,
  CheckCircle, AlertTriangle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import type { SectionName } from "@/types/project";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const sections: { title: string; url: string; icon: React.ElementType; section?: SectionName }[] = [
  { title: "Projet", url: "/projet", icon: Building2, section: "projet" },
  { title: "Build", url: "/build", icon: Hammer, section: "build" },
  { title: "Financement", url: "/financement", icon: Landmark, section: "financement" },
  { title: "Exploitation", url: "/exploitation", icon: TrendingUp, section: "exploitation" },
  { title: "Gouvernance", url: "/gouvernance", icon: Users, section: "gouvernance" },
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const location = useLocation();
  const { validated } = useProject();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Cockpit</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((item) => {
                const isActive = location.pathname === item.url;
                const isValidated = item.section ? validated[item.section] : undefined;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
