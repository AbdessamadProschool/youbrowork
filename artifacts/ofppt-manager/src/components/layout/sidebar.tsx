import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UsersRound, AlertTriangle, Upload, BookOpen, Search, Sun, Moon, BarChart3, LogOut, GraduationCap, Building2, CalendarClock } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Accueil", href: "/", icon: LayoutDashboard },
    { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
    { name: "Modules Validés", href: "/modules-valides", icon: BookOpen },
    { name: "Groupes", href: "/groupes", icon: UsersRound },
    { name: "Stagiaires", href: "/stagiaires", icon: Users },
    { name: "Alertes", href: "/alertes", icon: AlertTriangle },
    { name: "Import", href: "/import", icon: Upload },
    { name: "Modules", href: "/modules", icon: BookOpen },
    { name: "Reporting", href: "/reporting", icon: BarChart3 },
    { name: "Formateurs", href: "/formateurs", icon: GraduationCap },
    { name: "Salles", href: "/salles", icon: Building2 },
    { name: "Emploi du Temps", href: "/emploi-du-temps", icon: CalendarClock },
  ];

  const etabNom = localStorage.getItem("selected_etab_nom") || "—";

  const changeEtab = () => {
    localStorage.removeItem("selected_etab_id");
    localStorage.removeItem("selected_etab_nom");
    window.location.href = "/";
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex">
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <div className="w-8 h-8 rounded bg-[#00a651] text-white flex items-center justify-center font-bold">
            O
          </div>
          <span className="text-[#00a651]">OFPPT Manager</span>
        </div>
        <ModeToggle />
      </div>

      {etabNom !== "—" && (
        <div className="px-4 py-3 bg-slate-50 border-b border-sidebar-border">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Centre Actif</p>
          <div className="flex items-center justify-between group">
             <span className="text-xs font-black text-[#00508f] truncate uppercase">{etabNom}</span>
             <button 
               onClick={changeEtab}
               className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-[#00963f] hover:text-white transition-all shadow-sm"
               title="Changer d'établissement"
             >
                <Building2 className="h-3 w-3" />
             </button>
          </div>
        </div>
      )}

      <div className="px-3 py-2">
        <button 
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-muted-foreground border rounded-md hover:bg-sidebar-accent/30 transition-colors"
        >
          <Search className="h-3 w-3" />
          <span>Recherche...</span>
          <span className="ml-auto opacity-50 px-1 border rounded text-[8px] bg-muted">CTRL+K</span>
        </button>
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
      
      <div className="p-4 border-t border-sidebar-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium">
            DR
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Directeur</span>
            <span className="text-xs text-muted-foreground mt-1">CF Nahda-Sammara</span>
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("ofppt_auth");
            window.location.href = "/login";
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}