import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGetStagiaires, useGetGroupes } from "@workspace/api-client-react";
import { 
  Users, 
  UsersRound, 
  LayoutDashboard, 
  AlertTriangle, 
  Upload, 
  BookOpen,
  Search
} from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: stagiaires = [] } = useGetStagiaires();
  const { data: groupes = [] } = useGetGroupes();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher un stagiaire, un groupe ou une page..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setLocation("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Tableau de bord</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/groupes"))}>
            <UsersRound className="mr-2 h-4 w-4" />
            <span>Groupes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/stagiaires"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Stagiaires</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/alertes"))}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Alertes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/modules"))}>
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Modules</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setLocation("/import"))}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Importation</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Groupes">
          {groupes.slice(0, 10).map((g) => (
            <CommandItem
              key={g.id}
              onSelect={() => runCommand(() => setLocation(`/groupes/${g.id}`))}
            >
              <UsersRound className="mr-2 h-4 w-4" />
              <span>{g.code} — {g.filiereNom} ({g.annee}A)</span>
            </CommandItem>
          ))}
          <CommandItem onSelect={() => runCommand(() => setLocation("/groupes"))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Voir tous les groupes...</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Stagiaires">
          {stagiaires.slice(0, 20).map((s) => (
            <CommandItem
              key={s.id}
              onSelect={() => runCommand(() => setLocation(`/stagiaires/${s.cef}`))}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>{s.nomComplet} ({s.cef}) — {s.groupeCode}</span>
            </CommandItem>
          ))}
          <CommandItem onSelect={() => runCommand(() => setLocation("/stagiaires"))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Voir tous les stagiaires...</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
