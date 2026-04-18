import { AppLayout } from "@/components/layout/app-layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Home from "./pages/home";
import Login from "./pages/login";
import ModulesValides from "./pages/modules-valides";
import Groupes from "@/pages/groupes";
import GroupeDetail from "@/pages/groupe-detail";
import GroupeStagiaires from "@/pages/groupe-stagiaires";
import Modules from "@/pages/modules";
import Stagiaires from "@/pages/stagiaires";
import StagiaireDetail from "@/pages/stagiaire-detail";
import Alertes from "@/pages/alertes";
import ImportPage from "@/pages/import";
import Reporting from "@/pages/reporting";
import Formateurs from "@/pages/formateurs";
import Salles from "@/pages/salles";
import Timetable from "@/pages/emploi-du-temps";
import Landing from "@/pages/landing";
import { useEffect } from "react";
import { useLocation } from "wouter";

const queryClient = new QueryClient();

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const isAuth = localStorage.getItem("ofppt_auth") === "true";
    if (!isAuth && location !== "/login") {
      setLocation("/login");
    }
    
    // Check if establishment is selected when accessing protected areas
    const etabSelected = localStorage.getItem("selected_etab_id");
    if (isAuth && !etabSelected && location !== "/" && location !== "/login") {
       setLocation("/");
    }
  }, [location, setLocation]);

  if (location === "/login") {
    return <Login />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/home" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/modules-valides" component={ModulesValides} />
        <Route path="/groupes" component={Groupes} />
        <Route path="/groupes/:id" component={GroupeDetail} />
        <Route path="/groupes/:id/stagiaires" component={GroupeStagiaires} />
        <Route path="/stagiaires" component={Stagiaires} />
        <Route path="/stagiaires/:cef" component={StagiaireDetail} />
        <Route path="/alertes" component={Alertes} />
        <Route path="/import" component={ImportPage} />
        <Route path="/modules" component={Modules} />
        <Route path="/reporting" component={Reporting} />
        <Route path="/formateurs" component={Formateurs} />
        <Route path="/salles" component={Salles} />
        <Route path="/emploi-du-temps" component={Timetable} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "next-themes";
import { CommandMenu } from "@/components/command-menu";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <CommandMenu />
          </WouterRouter>
          <Toaster />
          <SonnerToaster position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;