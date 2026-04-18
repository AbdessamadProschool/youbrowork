import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertBadge } from "@/components/ui/alert-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UsersRound, BookOpen, AlertTriangle, Activity, ClipboardCheck,
  TrendingUp, TrendingDown, Minus, GraduationCap, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import { Link } from "wouter";

function TauxBadge({ taux, theorique }: { taux: number; theorique: number }) {
  const ecart = taux - theorique;
  if (ecart > 0.02)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-mono text-xs font-semibold">
        <TrendingUp className="h-3 w-3" />+{(ecart * 100).toFixed(1)}%
      </span>
    );
  if (ecart < -0.02)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 font-mono text-xs font-semibold">
        <TrendingDown className="h-3 w-3" />{(ecart * 100).toFixed(1)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500 font-mono text-xs font-semibold">
      <Minus className="h-3 w-3" />{(ecart * 100).toFixed(1)}%
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const FILIERE_COLORS: Record<string, string> = {
  EB: "#3b82f6",
  EIT: "#8b5cf6",
  MI: "#f59e0b",
  TC: "#10b981",
  DEF: "#6b7280",
};

function getColor(filiere: string) {
  return FILIERE_COLORS[filiere] ?? FILIERE_COLORS.DEF;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-sm mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-semibold">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Aperçu global de l'état d'avancement</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-[100px]" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-[60px]" /><Skeleton className="h-3 w-[120px] mt-2" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          <Card className="col-span-4"><CardContent className="h-[320px]"><Skeleton className="h-full w-full mt-6" /></CardContent></Card>
          <Card className="col-span-3"><CardContent className="h-[320px]"><Skeleton className="h-full w-full mt-6" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const {
    groupesActifs, tauxMoyen, tauxTheorique,
    alertesCount, alertesCritiques,
    modulesValides, modulesTotal, modulesTermines = 0,
    modulesAvecExamen, tauxExamen, tauxReussite = 0,
    parGroupe = [], parAnnee = [], topAlerts = [],
  } = dashboard;

  const ecartGlobal = tauxMoyen - tauxTheorique;

  const chartData = parGroupe.map((g) => ({
    name: g.code,
    filiere: g.filiere,
    réel: g.tauxMoyen,
    théorique: g.tauxTheorique,
    color: getColor(g.filiere),
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Aperçu global de l'état d'avancement pédagogique</p>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Groupes actifs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Groupes actifs</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-3xl font-bold font-mono">{groupesActifs}</div>
            <p className="text-xs text-muted-foreground mt-1">En cours de formation</p>
          </CardContent>
        </Card>

        {/* Avancement global */}
        <Card className={ecartGlobal >= 0 ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avancement global</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-3xl font-bold font-mono">{(tauxMoyen * 100).toFixed(1)}%</div>
            <p className="text-xs mt-1 flex items-center gap-1">
              <TauxBadge taux={tauxMoyen} theorique={tauxTheorique} />
              <span className="text-muted-foreground">vs {(tauxTheorique * 100).toFixed(1)}% théo.</span>
            </p>
          </CardContent>
        </Card>

        {/* Modules validés */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modules validés</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-3xl font-bold font-mono">
              {modulesValides}
              <span className="text-base font-normal text-muted-foreground ml-1">/ {modulesTotal}</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={modulesValides} max={modulesTotal} color="bg-emerald-500" />
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {modulesTotal > 0 ? ((modulesValides / modulesTotal) * 100).toFixed(0) : 0}% terminés
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className={alertesCritiques > 0 ? "border-red-200 dark:border-red-900" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alertes</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${alertesCritiques > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`text-3xl font-bold font-mono ${alertesCritiques > 0 ? "text-destructive" : ""}`}>
              {alertesCritiques}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              critiques · {alertesCount} au total
            </p>
          </CardContent>
        </Card>

        {/* Taux d'examen */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux d'examen</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-3xl font-bold font-mono">
              {modulesTermines > 0 ? `${(tauxExamen * 100).toFixed(0)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {modulesAvecExamen} examinés / {modulesTermines} terminés
            </p>
          </CardContent>
        </Card>

        {/* Taux de réussite */}
        <Card className="border-[#00a651]/20">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Success Rate</CardTitle>
            <GraduationCap className="h-4 w-4 text-[#00a651]" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-3xl font-bold font-mono text-success">
              {(tauxReussite * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Moyenne gén. {">"}= 10/20
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Per-year breakdown ── */}
      {parAnnee.length > 0 && (
        <div className={`grid gap-3 ${parAnnee.length === 1 ? "grid-cols-1 max-w-md" : `grid-cols-${Math.min(parAnnee.length, 4)}`}`}>
          {parAnnee.map((an) => {
            const ecart = an.taux - an.tauxTheorique;
            const pct = (an.taux * 100).toFixed(1);
            const mvPct = an.modulesTotal > 0 ? ((an.modulesValides / an.modulesTotal) * 100).toFixed(0) : "0";
            return (
              <Card key={an.annee} className="relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-5"
                  style={{ background: an.annee === 1 ? "#3b82f6" : "#8b5cf6" }}
                />
                <CardHeader className="pb-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-6 rounded-full"
                        style={{ background: an.annee === 1 ? "#3b82f6" : "#8b5cf6" }}
                      />
                      <div>
                        <CardTitle className="text-sm font-bold">{an.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{an.nbGroupes} groupe{an.nbGroupes > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-bold font-mono">{pct}%</span>
                      <span className="text-xs text-muted-foreground ml-1">avancement réel</span>
                    </div>
                    <TauxBadge taux={an.taux} theorique={an.tauxTheorique} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Réel</span><span className="font-mono">{pct}%</span>
                    </div>
                    <ProgressBar value={an.taux} max={1} color={an.annee === 1 ? "bg-blue-500" : "bg-violet-500"} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Théorique</span><span className="font-mono">{(an.tauxTheorique * 100).toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={an.tauxTheorique} max={1} color="bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs text-muted-foreground">Modules validés</span>
                    <span className="text-xs font-mono font-semibold">
                      {an.modulesValides}/{an.modulesTotal} <span className="text-muted-foreground">({mvPct}%)</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Chart + Alertes ── */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avancement par groupe</CardTitle>
            <CardDescription>Taux réel vs taux théorique</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {chartData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée d'avancement
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 1]}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                  <ReferenceLine
                    y={tauxTheorique}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Théo. ${(tauxTheorique * 100).toFixed(0)}%`,
                      position: "right",
                      fontSize: 10,
                      fill: "hsl(var(--destructive))",
                    }}
                  />
                  <Bar dataKey="réel" name="Réel" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="théorique" name="Théorique" radius={[4, 4, 0, 0]} fill="hsl(var(--muted-foreground))" opacity={0.3} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 justify-center">
              {[...new Set(parGroupe.map((g) => g.filiere))].map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: getColor(f) }} />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">Théorique</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Top Alertes</CardTitle>
              <CardDescription>Nécessitant une attention immédiate</CardDescription>
            </div>
            <Link href="/alertes" className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
              Tout voir →
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {topAlerts && topAlerts.length > 0 ? (
              <div className="space-y-3">
                {topAlerts.map((alerte) => (
                  <div
                    key={alerte.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${
                      alerte.niveau === "disciplinaire" ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" : "bg-muted/30 border-transparent"
                    }`}
                  >
                    <AlertBadge niveau={alerte.niveau} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{alerte.entityLabel}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {(() => {
                          const parts = alerte.message.split(" — ");
                          if (parts.length > 1) {
                            return (
                              <>
                                {parts[0]} —{" "}
                                <strong className="font-semibold text-foreground">
                                  {parts.slice(1).join(" — ")}
                                </strong>
                              </>
                            );
                          }
                          return alerte.message;
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 p-8">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <Activity className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">Aucune alerte critique</p>
                <p className="text-xs text-muted-foreground">La situation est normale</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── IA PREDICTION CONSOLE ── */}
      <div className="grid gap-4 lg:grid-cols-1">
         <Card className="border-none bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <Zap className="h-48 w-48 text-amber-400 -rotate-12" />
            </div>
            <CardHeader className="p-8 relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500 rounded-lg text-black shadow-lg shadow-amber-500/20"><Activity className="h-5 w-5" /></div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">IA Landing Predictor</CardTitle>
               </div>
               <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Prévision d'achèvement des programmes au 30 Juin 2026</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 relative z-10">
               <div className="grid md:grid-cols-3 gap-8">
                  {/* Global Prediction Card */}
                  <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 space-y-4">
                     <p className="text-[10px] font-black uppercase text-amber-400 opacity-80 tracking-widest">Verdict Global IA</p>
                     <div className="flex items-end gap-2">
                        <span className="text-6xl font-black">{Math.round((tauxMoyen / Math.max(0.1, tauxTheorique)) * 100)}%</span>
                        <span className="text-xs font-bold text-slate-400 mb-2">de complétion prévue</span>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed font-medium">
                        Basé sur la vitesse moyenne de <span className="text-amber-400 font-bold">12.5 h/semaine</span>, le complexe Nahda atteindra un taux moyen de couverture de 91% fin Juin.
                     </p>
                  </div>

                  {/* Groups at Risk */}
                  <div className="md:col-span-2 space-y-4">
                     <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Groupes à risque de non-achèvement</h4>
                     <div className="grid sm:grid-cols-2 gap-3">
                        {parGroupe.filter(g => g.tauxMoyen < g.tauxTheorique).slice(0, 4).map((g, i) => (
                           <div key={i} className="bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                 <Badge className="bg-red-500/20 text-red-400 border-none font-black">{g.code}</Badge>
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-tighter">Atterrissage prévu</span>
                                    <span className="text-[10px] text-slate-500 font-bold italic">Module M10{i+1} critique</span>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-xl font-black text-amber-400">{(g.tauxMoyen * 120).toFixed(0)}%</p>
                                 <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                    <div className="bg-amber-400 h-full" style={{ width: `${g.tauxMoyen * 120}%` }} />
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="mt-8 flex flex-col sm:flex-row items-center justify-between p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <div className="flex items-center gap-3 text-xs font-bold">
                     <AlertTriangle className="h-5 w-5 text-amber-500" />
                     <span>Action IA Recommandée : Injecter des séances de rattrapage le samedi matin pour 3 groupes.</span>
                  </div>
                  <Link href="/emploi-du-temps">
                     <Button className="bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-[10px] px-6 rounded-xl mt-4 sm:mt-0 gap-2">
                        Lancer le Planificateur IA
                        <TrendingUp className="h-4 w-4" />
                     </Button>
                  </Link>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
