import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertBadge } from "@/components/ui/alert-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersRound, BookOpen, AlertTriangle, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Aperçu global de l'état d'avancement</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="h-3 w-[120px] mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const {
    groupesActifs,
    tauxMoyen,
    tauxTheorique,
    alertesCount,
    alertesCritiques,
    modulesValides,
    modulesTotal,
    topAlerts,
  } = dashboard;

  const ecartGlobal = tauxMoyen - tauxTheorique;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Aperçu global de l'état d'avancement</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Groupes actifs</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{groupesActifs}</div>
            <p className="text-xs text-muted-foreground mt-1">En cours de formation</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avancement global</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{tauxMoyen.toFixed(1)}%</div>
            <p className="text-xs mt-1 flex items-center gap-1 font-mono">
              <span className={ecartGlobal < 0 ? "text-destructive" : (ecartGlobal > 0 ? "text-success" : "text-muted-foreground")}>
                {ecartGlobal > 0 ? '+' : ''}{ecartGlobal.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs {tauxTheorique.toFixed(1)}% théo.</span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Modules validés</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{modulesValides} <span className="text-sm text-muted-foreground">/ {modulesTotal}</span></div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{((modulesValides / (modulesTotal || 1)) * 100).toFixed(1)}% d'achèvement</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Alertes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive">{alertesCritiques}</div>
            <p className="text-xs text-muted-foreground mt-1">Critiques sur {alertesCount} au total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Avancement vs Théorique</CardTitle>
            <CardDescription>Comparaison par groupe (échantillon)</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {/* Minimal mockup data for chart, assuming it's not provided by API directly in dashboard */}
            <div className="h-[300px] w-full bg-muted/20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground text-sm">
              [Graphique d'avancement]
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Alertes</CardTitle>
              <CardDescription>Nécessitant une attention immédiate</CardDescription>
            </div>
            <Link href="/alertes" className="text-sm font-medium text-primary hover:underline">
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {topAlerts && topAlerts.length > 0 ? (
              <div className="space-y-4">
                {topAlerts.map(alerte => (
                  <div key={alerte.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertBadge niveau={alerte.niveau} />
                        <span className="font-medium text-sm">{alerte.entityLabel}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alerte.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-8">
                <div className="rounded-full bg-success/10 p-3">
                  <Activity className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-medium">Aucune alerte critique</p>
                <p className="text-xs text-muted-foreground">La situation est normale</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}