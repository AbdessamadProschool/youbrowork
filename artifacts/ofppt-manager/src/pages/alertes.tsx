import React from "react";
import {
  useGetAlertes,
  getGetAlertesQueryKey,
  GetAlertesNiveau,
  GetAlertesEntity,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Search,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL ?? "/";

type Alerte = {
  id: string;
  niveau: string;
  message: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  createdAt: string;
};

// ── Niveau metadata ────────────────────────────────────────────────────────
const NIVEAU_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  rowClass: string;
  headerClass: string;
  dotClass: string;
}> = {
  disciplinaire: {
    label: "Disciplinaire",
    icon: ShieldAlert,
    badgeClass: "bg-red-600 text-white border-red-600",
    rowClass: "border-l-4 border-l-red-600 bg-red-950/30",
    headerClass: "text-red-400 border-b border-red-800/40 bg-red-950/20",
    dotClass: "bg-red-500",
  },
  critique: {
    label: "Critique",
    icon: XCircle,
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    rowClass: "border-l-4 border-l-destructive/60 bg-destructive/5 hover:bg-destructive/10",
    headerClass: "text-destructive border-b border-destructive/20 bg-destructive/5",
    dotClass: "bg-destructive",
  },
  warning: {
    label: "Avertissement",
    icon: AlertTriangle,
    badgeClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    rowClass: "border-l-4 border-l-amber-500/60 hover:bg-amber-500/5",
    headerClass: "text-amber-500 border-b border-amber-500/20 bg-amber-500/5",
    dotClass: "bg-amber-500",
  },
  anomalie: {
    label: "Anomalie",
    icon: Info,
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-400/30",
    rowClass: "border-l-4 border-l-blue-400/60 hover:bg-blue-400/5",
    headerClass: "text-blue-400 border-b border-blue-400/20 bg-blue-400/5",
    dotClass: "bg-blue-400",
  },
};

const NIVEAU_ORDER = ["disciplinaire", "critique", "warning", "anomalie"];

// ── Discipline row with confirm flow ──────────────────────────────────────
function DisciplinaireRow({ alerte }: { alerte: Alerte }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function handleValidate() {
    setLoading(true);
    try {
      await fetch(`${BASE}api/stagiaires/${alerte.entityId}/discipline`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: getGetAlertesQueryKey({}) });
      await qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  const parts = alerte.message.split(" — ");
  const meta = NIVEAU_META.disciplinaire;
  const Icon = meta.icon;

  return (
    <TableRow className={cn(meta.rowClass, "animate-pulse-red transition-colors")}>
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-red-400 shrink-0" />
          <Badge variant="outline" className={cn("text-xs font-semibold", meta.badgeClass)}>
            DISCIPLINAIRE
          </Badge>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <p className="text-sm font-semibold text-red-300">{parts[0]}</p>
        {parts.length > 1 && (
          <p className="text-xs text-muted-foreground mt-0.5">{parts.slice(1).join(" — ")}</p>
        )}
      </TableCell>
      <TableCell className="py-3">
        <Link
          href={`/stagiaires/${alerte.entityId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {alerte.entityLabel}
        </Link>
      </TableCell>
      <TableCell className="py-3 text-right">
        {confirming ? (
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">Confirmer la sanction ?</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-xs"
              disabled={loading}
              onClick={handleValidate}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={loading}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs border-red-600/50 text-red-400 hover:bg-red-900/40"
            onClick={() => setConfirming(true)}
          >
            Valider discipline
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Standard alert row ─────────────────────────────────────────────────────
function AlertRow({ alerte }: { alerte: Alerte }) {
  const meta = NIVEAU_META[alerte.niveau] ?? NIVEAU_META.anomalie;
  const Icon = meta.icon;
  const parts = alerte.message.split(" — ");

  return (
    <TableRow className={cn(meta.rowClass, "transition-colors")}>
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 opacity-70" />
          <Badge variant="outline" className={cn("text-xs font-semibold", meta.badgeClass)}>
            {meta.label.toUpperCase()}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="py-3">
        {parts.length > 1 ? (
          <>
            <p className="text-sm text-muted-foreground">{parts[0]}</p>
            <p className="text-sm font-semibold mt-0.5">{parts.slice(1).join(" — ")}</p>
          </>
        ) : (
          <p className="text-sm font-medium">{alerte.message}</p>
        )}
      </TableCell>
      <TableCell className="py-3">
        <Link
          href={alerte.entity === "groupe" ? `/groupes/${alerte.entityId}` : `/stagiaires/${alerte.entityId}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {alerte.entity === "groupe" ? "Groupe: " : ""}{alerte.entityLabel}
        </Link>
      </TableCell>
      <TableCell className="py-3 text-right text-xs text-muted-foreground">
        {new Date(alerte.createdAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </TableCell>
    </TableRow>
  );
}

// ── Summary KPI card ──────────────────────────────────────────────────────
function KpiCard({
  niveau,
  count,
  active,
  onClick,
}: {
  niveau: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const meta = NIVEAU_META[niveau] ?? NIVEAU_META.anomalie;
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[110px] rounded-lg border p-4 text-left transition-all",
        "hover:shadow-md cursor-pointer",
        active ? "ring-2 ring-primary bg-muted/30" : "bg-card hover:bg-muted/20"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
        {niveau === "disciplinaire" && count > 0 && (
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>
      <p className={cn("text-2xl font-bold tabular-nums", count > 0 ? "" : "text-muted-foreground")}>
        {count}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{meta.label}</p>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Alertes() {
  const [niveauFilter, setNiveauFilter] = useState<GetAlertesNiveau | "all">("all");
  const [entityFilter, setEntityFilter] = useState<GetAlertesEntity | "all">("all");
  const [search, setSearch] = useState("");

  const params = {
    ...(niveauFilter !== "all" ? { niveau: niveauFilter } : {}),
    ...(entityFilter !== "all" ? { entity: entityFilter } : {}),
  };

  const { data: alertes = [], isLoading } = useGetAlertes(params, {
    query: { queryKey: getGetAlertesQueryKey(params) },
  });

  // counts per niveau (from ALL alertes, before search filter)
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of alertes) c[a.niveau] = (c[a.niveau] ?? 0) + 1;
    return c;
  }, [alertes]);

  // apply search
  const filtered = useMemo(() => {
    if (!search.trim()) return alertes;
    const q = search.toLowerCase();
    return alertes.filter(
      (a) =>
        a.message.toLowerCase().includes(q) ||
        a.entityLabel.toLowerCase().includes(q)
    );
  }, [alertes, search]);

  // group by niveau in order
  const grouped = useMemo(() => {
    const g = new Map<string, Alerte[]>();
    for (const niv of NIVEAU_ORDER) g.set(niv, []);
    for (const a of filtered) {
      const key = NIVEAU_ORDER.includes(a.niveau) ? a.niveau : "anomalie";
      g.get(key)!.push(a);
    }
    return g;
  }, [filtered]);

  const total = alertes.length;
  const totalFiltered = filtered.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        @keyframes pulse-red {
          0%, 100% { background-color: rgba(127,29,29,0.25); }
          50%       { background-color: rgba(185,28,28,0.45); }
        }
        .animate-pulse-red { animation: pulse-red 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Chargement…" : `${total} alerte${total !== 1 ? "s" : ""} au total`}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-[180px] text-sm"
            />
          </div>
          <Select value={niveauFilter} onValueChange={(v) => setNiveauFilter(v as any)}>
            <SelectTrigger className="h-9 w-[150px] text-sm">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous niveaux</SelectItem>
              <SelectItem value="disciplinaire">Disciplinaire</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
              <SelectItem value="warning">Avertissement</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <SelectValue placeholder="Entité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes entités</SelectItem>
              <SelectItem value="groupe">Groupes</SelectItem>
              <SelectItem value="stagiaire">Stagiaires</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="flex gap-3 flex-wrap">
        {NIVEAU_ORDER.map((niv) => (
          <KpiCard
            key={niv}
            niveau={niv}
            count={counts[niv] ?? 0}
            active={niveauFilter === niv}
            onClick={() =>
              setNiveauFilter((prev) => (prev === niv ? "all" : (niv as GetAlertesNiveau)))
            }
          />
        ))}
      </div>

      {/* Alert table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : totalFiltered === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-60" />
              <p className="text-sm">
                {search ? "Aucun résultat pour cette recherche" : "Aucune alerte à afficher"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[160px]">Niveau</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[200px]">Concerné</TableHead>
                  <TableHead className="w-[220px] text-right">Action / Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {NIVEAU_ORDER.map((niv) => {
                  const rows = grouped.get(niv) ?? [];
                  if (rows.length === 0) return null;
                  const meta = NIVEAU_META[niv];
                  const Icon = meta.icon;
                  return (
                    <React.Fragment key={niv}>
                      {/* Section header row */}
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={4}
                          className={cn("py-2 px-4 text-xs font-bold uppercase tracking-wider", meta.headerClass)}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5" />
                            {meta.label} — {rows.length} alerte{rows.length > 1 ? "s" : ""}
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Data rows */}
                      {rows.map((a) =>
                        niv === "disciplinaire" ? (
                          <DisciplinaireRow key={a.id} alerte={a} />
                        ) : (
                          <AlertRow key={a.id} alerte={a} />
                        )
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {search && totalFiltered !== total && (
        <p className="text-xs text-muted-foreground text-right">
          {totalFiltered} résultat{totalFiltered !== 1 ? "s" : ""} sur {total}
        </p>
      )}
    </div>
  );
}
