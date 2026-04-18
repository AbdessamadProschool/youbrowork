import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, ChevronRight, Users, Plus, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Etablissement {
  id: string;
  nom: string;
  code: string;
  ville: string;
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ code: "", nom: "", ville: "" });

  const { data: etablissements, isLoading } = useQuery<Etablissement[]>({
    queryKey: ["/api/etablissements"],
    queryFn: async () => {
      const res = await fetch("/api/etablissements");
      if (!res.ok) throw new Error("Failed to fetch etablissements");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/etablissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur de création");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/etablissements"] });
      setOpen(false);
      setFormData({ code: "", nom: "", ville: "" });
      toast({ title: "Succès", description: "Établissement raccordé au réseau" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de l'ajout", variant: "destructive" });
    }
  });

  const selectEtab = (etab: Etablissement) => {
    localStorage.setItem("selected_etab_id", etab.id);
    localStorage.setItem("selected_etab_nom", etab.nom);
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 border-t-4 border-[#00508f]">
      <div className="w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex-1 flex flex-col">
        
        {/* HEADER SIMPLE */}
        <header className="mb-16 space-y-6">
          <div className="flex items-center gap-3 text-[#00508f]">
            <Globe className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Infrastructure Régionale d'Excellence</span>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
                Choisir un <span className="text-[#00508f]">Établissement</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm max-w-md">
                Sélectionnez votre périmètre de gestion pour activer le pilotage des ressources.
              </p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#00508f] hover:bg-slate-900 text-white rounded-xl px-6 py-6 h-auto font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg">
                   <Plus className="h-4 w-4 mr-2" />
                   Nouveau Centre
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[450px] rounded-3xl p-8 border-none shadow-2xl">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-xl font-bold text-slate-800 uppercase">Paramétrage Réseau</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Code (ex: CF_NAHDA)</Label>
                    <Input 
                      value={formData.code} 
                      className="h-12 border-slate-100 bg-slate-50 font-bold"
                      onChange={e => setFormData({...formData, code: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Nom de l'Etablissement</Label>
                    <Input 
                      value={formData.nom} 
                      className="h-12 border-slate-100 bg-slate-50 font-bold"
                      onChange={e => setFormData({...formData, nom: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Ville</Label>
                    <Input 
                      value={formData.ville} 
                      className="h-12 border-slate-100 bg-slate-50 font-bold"
                      onChange={e => setFormData({...formData, ville: e.target.value})} 
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => createMutation.mutate(formData)} 
                  disabled={createMutation.isPending} 
                  className="w-full h-12 mt-8 rounded-xl bg-[#00963f] hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-widest transition-all"
                >
                   {createMutation.isPending ? "Traitement..." : "Raccorder au Registre"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* GRID PROFESSIONNEL */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {etablissements?.map((etab) => (
            <Card 
              key={etab.id} 
              onClick={() => selectEtab(etab)}
              className="group cursor-pointer border border-slate-100 bg-white hover:border-[#00508f] hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
            >
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-slate-50 group-hover:bg-[#00508f]/5 rounded-xl transition-colors">
                      <Building2 className="h-6 w-6 text-[#00508f]" />
                   </div>
                   <div className="px-3 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-widest italic group-hover:bg-[#00508f] group-hover:text-white transition-all">
                      {etab.code}
                   </div>
                </div>

                <div className="space-y-1">
                   <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#00508f] uppercase leading-tight transition-colors">{etab.nom}</h3>
                   <p className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <MapPin className="h-4 w-4" />
                      {etab.ville}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 group-hover:border-[#00508f]/10">
                   <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-300" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Silo Sécurisé</span>
                   </div>
                   <div className="flex justify-end">
                      <Button size="icon" variant="ghost" className="rounded-full group-hover:bg-[#00963f] group-hover:text-white transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <footer className="mt-auto pt-20 text-center">
           <p className="text-[10px] font-bold uppercase text-slate-300 tracking-[0.4em]">OFPPT Specs Manager — Management Régional Digitalisé</p>
        </footer>
      </div>
    </div>
  );
}
