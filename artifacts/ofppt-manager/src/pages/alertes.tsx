import React, { useState, useMemo } from "react";
import {
  useGetAlertes,
  getGetAlertesQueryKey,
  GetAlertesNiveau,
  GetAlertesEntity,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
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

const NIVEAU_CONFIG: Record<string, { label: string; dot: string; row: string }> = {
  disciplinaire: {
    label: "Disciplinaire",
    dot: "bg-red-500",
    row: "border-l-[3px] border-l-red-500",
  },
  critique: {
    label: "Critique",
    dot: "bg-red-400",
    row: "border-l-[3px] border-l-red-400",
  },
  warning: {
    label: "Avertissement",
    dot: "bg-amber-400",
    row: "border-l-[3px] border-l-amber-400",
  },
  anomalie: {
    label: "Anomalie",
    dot: "bg-blue-400",
    row: "border-l-[3px] border-l-blue-400",
  },
};

const NIVEAU_ORDER = ["disciplinaire", "critique", "warning", "anomalie"];

function NiveauDot({ niveau }: { niveau: string }) {
  const cfg = NIVEAU_CONFIG[niveau] ?? NIVEAU_CONFIG.anomalie;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
      <span className="text-xs font-medium">{cfg.label}</span>
    </div>
  );
}

function DisciplinaireAction({ alerte }: { alerte: Alerte }) {
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

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
        onClick={() => setConfirming(true)}
      >
        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
        Valider
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Confirmer ?</span>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 px-2 text-xs"
        disabled={loading}
        onClick={handleValidate}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Oui"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        disabled={loading}
        onClick={() => setConfirming(false)}
      >
        Non
      </Button>
    </div>
  );
}

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

  const sorted = useMemo(
    () =>
      [...alertes].sort(
        (a, b) =>
          NIVEAU_ORDER.indexOf(a.niveau) - NIVEAU_ORDER.indexOf(b.niveau)
      ),
    [alertes]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (a) =>
        a.message.toLowerCase().includes(q) ||
        a.entityLabel.toLowerCase().includes(q)
    );
  }, [sorted, search]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <style>{`
        @keyframes disc-pulse {
          0%, 100% { background-color: rgba(127,29,29,0.18); }
          50%       { background-color: rgba(185,28,28,0.32); }
        }
        .disc-row { animation: disc-pulse 2.2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Chargement…" : `${filtered.length} alerte${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-44 text-sm"
            />
          </div>

          <Select value={niveauFilter} onValueChange={(v) => setNiveauFilter(v as any)}>
            <SelectTrigger className="h-9 w-40 text-sm">
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
            <SelectTrigger className="h-9 w-36 text-sm">
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

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[130px]">Niveau</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[180px]">Concerné</TableHead>
              <TableHead className="w-[160px] text-right">Action / Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i} className="border-l-[3px] border-l-transparent">
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full max-w-xs" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="border-l-[3px] border-l-transparent hover:bg-transparent">
                <TableCell colSpan={4} className="h-36 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-7 w-7 text-green-500 opacity-50" />
                    <span className="text-sm">
                      {search ? "Aucun résultat" : "Aucune alerte"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => {
                const cfg = NIVEAU_CONFIG[a.niveau] ?? NIVEAU_CONFIG.anomalie;
                const isDisc = a.niveau === "disciplinaire";
                const parts = a.message.split(" — ");

                return (
                  <TableRow
                    key={a.id}
                    className={cn(
                      cfg.row,
                      "transition-colors",
                      isDisc && "disc-row"
                    )}
                  >
                    <TableCell className="py-3">
                      <NiveauDot niveau={a.niveau} />
                    </TableCell>

                    <TableCell className="py-3">
                      {parts.length > 1 ? (
                        <span className="text-sm">
                          <span className="text-muted-foreground">{parts[0]}</span>
                          <span className="text-foreground font-medium"> — {parts.slice(1).join(" — ")}</span>
                        </span>
                      ) : (
                        <span className="text-sm font-medium">{a.message}</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      <Link
                        href={a.entity === "groupe" ? `/groupes/${a.entityId}` : `/stagiaires/${a.entityId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {a.entityLabel}
                      </Link>
                    </TableCell>

                    <TableCell className="py-3 text-right">
                      {isDisc ? (
                        <DisciplinaireAction alerte={a} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
