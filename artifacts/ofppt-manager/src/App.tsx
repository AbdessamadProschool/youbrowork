import { AppLayout } from "@/components/layout/app-layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Groupes from "@/pages/groupes";
import GroupeDetail from "@/pages/groupe-detail";
import GroupeStagiaires from "@/pages/groupe-stagiaires";
import Modules from "@/pages/modules";
import Stagiaires from "@/pages/stagiaires";
import StagiaireDetail from "@/pages/stagiaire-detail";
import Alertes from "@/pages/alertes";
import ImportPage from "@/pages/import";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/groupes" component={Groupes} />
        <Route path="/groupes/:id" component={GroupeDetail} />
        <Route path="/groupes/:id/stagiaires" component={GroupeStagiaires} />
        <Route path="/stagiaires" component={Stagiaires} />
        <Route path="/stagiaires/:cef" component={StagiaireDetail} />
        <Route path="/alertes" component={Alertes} />
        <Route path="/import" component={ImportPage} />
        <Route path="/modules" component={Modules} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;