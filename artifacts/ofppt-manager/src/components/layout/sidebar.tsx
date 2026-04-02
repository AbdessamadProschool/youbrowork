import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UsersRound, AlertTriangle, Upload, BookOpen } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: LayoutDashboard },
    { name: "Groupes", href: "/groupes", icon: UsersRound },
    { name: "Stagiaires", href: "/stagiaires", icon: Users },
    { name: "Alertes", href: "/alertes", icon: AlertTriangle },
    { name: "Import", href: "/import", icon: Upload },
    { name: "Modules", href: "/modules", icon: BookOpen },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <div className="w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
            O
          </div>
          <span>OFPPT Manager</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium">
            DR
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Directeur</span>
            <span className="text-xs text-muted-foreground mt-1">CF Casablanca</span>
          </div>
        </div>
      </div>
    </div>
  );
}