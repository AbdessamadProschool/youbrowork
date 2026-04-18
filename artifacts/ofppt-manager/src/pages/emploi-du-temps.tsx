import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarClock, 
  Search, 
  BrainCircuit, 
  Printer, 
  AlertTriangle, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Activity,
  TrendingUp,
  XCircle,
  Database,
  ArrowRight,
  User,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFPPTLogo } from "@/components/ofppt-logo";

// Grid configuration
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const TIME_SLOTS = [ {debut: "08:30", fin: "11:00"}, {debut: "11:00", fin: "13:30"}, {debut: "13:30", fin: "16:00"}, {debut: "16:00", fin: "18:30"} ];

interface TimetableEntry {
  id: string;
  groupeCode: string;
  formateurNom: string;
  moduleCode: string;
  salleNom: string;
  jourSemaine: number; 
  heureDebut: string;
  heureFin: string;
  estForcé: boolean;
}

export default function TimetableGenerator() {
  const [viewMode, setViewMode] = useState<"groupe" | "formateur">("groupe");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [etabNom, setEtabNom] = useState("Établissement");

  useEffect(() => {
    const nom = localStorage.getItem("selected_etab_nom");
    if (nom) setEtabNom(nom);
  }, []);

  const etabId = localStorage.getItem("selected_etab_id");

  // Format dates for display
  const getWeekDates = (offset: number) => {
    const now = new Date();
    // Go to next Monday if offset > 0 or current week if offset=0
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day === 0 ? 1 : 8 - day);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() + (day === 0 ? 1 : 1 - day) + (offset * 7));
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);

    return { 
      start: startOfWeek.toISOString().split('T')[0], 
      end: endOfWeek.toISOString().split('T')[0], 
      display: `Du ${startOfWeek.toLocaleDateString("fr-FR")} Au ${endOfWeek.toLocaleDateString("fr-FR")}` 
    };
  };

  const currentPeriod = getWeekDates(currentWeekOffset);

  // Data fetching (Filtered by Date)
  const { data: emplois, isLoading, refetch } = useQuery<TimetableEntry[]>({
    queryKey: ["/api/emplois-ia", etabId, currentPeriod.start],
    queryFn: async () => {
      if (!etabId) return [];
      const res = await fetch(`/api/emplois-ia?startDate=${currentPeriod.start}&endDate=${currentPeriod.end}`, {
        headers: { "x-etab-id": etabId }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!etabId,
    initialData: [],
  });

  const uniqueGroupes = Array.from(new Set(emplois?.map((e) => e.groupeCode))).sort();
  const uniqueFormateurs = Array.from(new Set(emplois?.map((e) => e.formateurNom))).sort();

  useEffect(() => {
    if (viewMode === "groupe" && uniqueGroupes.length > 0 && !uniqueGroupes.includes(selectedEntity)) {
      setSelectedEntity(uniqueGroupes[0]);
    } else if (viewMode === "formateur" && uniqueFormateurs.length > 0 && !uniqueFormateurs.includes(selectedEntity)) {
      setSelectedEntity(uniqueFormateurs[0]);
    }
  }, [viewMode, emplois, uniqueGroupes, uniqueFormateurs, selectedEntity]);
  const filteredEmplois = emplois?.filter((e) => {
    if (viewMode === "groupe") return e.groupeCode === selectedEntity;
    return e.formateurNom === selectedEntity;
  }) || [];

  const handleGenerateIA = async () => {
    if (!etabId) {
      toast.error("Établissement non identifié.");
      return;
    }

    setIsGenerating(true);
    setAiAdvice([]); 
    setAnomalies([]);
    toast.info("Lancement de la régulation...", { 
      description: "Analyse d'intégrité des données en cours." 
    });
    
    try {
      const response = await fetch("/api/genere-emploi", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-etab-id": etabId
        }
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Planification terminée : ${result.count} séances régulées.`);
        if (result.anomalies) setAnomalies(result.anomalies);
        if (result.conseils) setAiAdvice(result.conseils);
        refetch(); 
      } else {
        if (result.anomalies) setAnomalies(result.anomalies);
        toast.error("Incomplétude des données détectée.");
      }
    } catch (error) {
      toast.error("Échec critique du moteur de régulation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4') as any;
    const date = new Date().toLocaleDateString('fr-FR');
    const fullEtabNom = localStorage.getItem("selected_etab_nom") || "OFPPT";

    doc.setFillColor(0, 80, 143);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`PLANNING DE RÉGULATION - ${fullEtabNom.toUpperCase()}`, 148, 12, { align: "center" });
    
    const tableBody = filteredEmplois.map(e => [
      `${e.heureDebut} - ${e.heureFin}`,
      DAYS[e.jourSemaine - 1] || "Lundi",
      e.groupeCode,
      e.moduleCode,
      e.formateurNom,
      e.salleNom
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Heures', 'Jour', 'Groupe', 'Module', 'Formateur', 'Salle']],
      body: tableBody.length > 0 ? tableBody : [['Aucune donnée réelle disponible']],
      headStyles: { fillColor: [0, 80, 143] },
      theme: 'grid'
    });

    doc.save(`Emploi_${selectedEntity}_${fullEtabNom.replace(/\s+/g, '_')}.pdf`);
  };

  if (isLoading) {
    return <div className="p-12 bg-white min-h-screen space-y-6"><Skeleton className="h-8 w-64 rounded-xl" /><Skeleton className="h-[600px] w-full rounded-2xl" /></div>;
  }

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans border-t-2 border-[#00508f]">
      <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-8">
        
        {/* TOP BAR */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
             <div className="flex items-center gap-3 text-[#00508f]">
               <CalendarClock className="h-5 w-5" />
               <span className="text-[10px] font-bold uppercase tracking-widest">{etabNom}</span>
             </div>
             <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Moteur de <span className="text-[#00508f]">Régulation Dynamique</span></h1>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={exportPDF}
              className="h-11 px-6 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white"
            >
              <Printer className="h-4 w-4 text-slate-400" />
              Générer Rapports PDF
            </Button>
            <Button 
              onClick={handleGenerateIA}
              disabled={isGenerating}
              className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-[#00508f] text-white font-bold text-[10px] uppercase tracking-widest gap-2 shadow-md transition-all active:scale-95"
            >
              <BrainCircuit className={`h-4 w-4 ${isGenerating ? 'animate-spin' : 'text-[#00963f]'}`} />
              {isGenerating ? "Analyse d'Intégrité..." : "Calculer Prédiction Réelle"}
            </Button>
          </div>
        </header>

        {/* ANOMALIES & INTEGRITY REPORT */}
        {anomalies.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-8 rounded-r-3xl space-y-4 animate-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-3 text-red-700 font-bold text-sm uppercase">
               <AlertTriangle className="h-5 w-5" />
               Rapport d'Anomalies de Gestion (Données Incomplètes)
             </div>
             <div className="grid md:grid-cols-2 gap-4">
               {anomalies.map((a, idx) => (
                 <div key={idx} className="flex gap-3 bg-white p-4 rounded-xl border border-red-100 shadow-sm text-[11px] font-bold text-slate-600">
                   <ArrowRight className="h-4 w-4 text-red-400 shrink-0" />
                   {a}
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* AI ADVICE */}
        {aiAdvice.length > 0 && (
          <div className="bg-slate-50 border-l-4 border-[#00508f] p-8 rounded-r-3xl flex gap-8 items-start">
             <div className="p-4 bg-white rounded-2xl shadow-md"><Zap className="h-6 w-6 text-amber-500" /></div>
             <div className="space-y-1 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conseils Pédagogiques Stratégiques</p>
                <div className="text-sm font-semibold text-slate-700 leading-relaxed italic">
                  {aiAdvice[0]}
                </div>
             </div>
          </div>
        )}

        {/* EMPTY STATE - NO MOCKUPS */}
        {(!emplois || emplois.length === 0) && !isLoading && (
          <div className="h-[400px] bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10 space-y-6">
             <div className="p-6 bg-white rounded-full shadow-inner"><Database className="h-12 w-12 text-slate-200" /></div>
             <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold text-slate-400 uppercase">Données Réelles Indisponibles</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  L'IA refuse d'afficher des données fictives. Veuillez importer les avancements et ressources (Formateurs, Salles) pour votre centre via l'onglet "Import".
                </p>
             </div>
             <Button variant="outline" className="rounded-full h-10 px-8 text-[10px] font-black uppercase tracking-widest border-slate-300 text-slate-400">
               Vers le module d'Import
             </Button>
          </div>
        )}

        {/* REAL GRID - TEMPLATE PROFESSIONAL OFPPT */}
        {(emplois || []).length > 0 && (
           <div className="bg-white border-[1px] border-slate-300 shadow-xl overflow-hidden font-[Arial,sans-serif]">
              {/* HEADER REGIONAL */}
              <div className="grid grid-cols-3 p-4 border-b-[1px] border-slate-400 bg-slate-50/50">
                 <div className="text-[10px] font-bold text-slate-800 space-y-0">
                    <p>DRO / CFI / CQP ENNAHDA</p>
                    <div className="mt-8 flex items-center gap-2">
                       <span className="bg-slate-100 px-2 py-1 border border-slate-300 rounded text-[11px] uppercase">
                          {viewMode === "groupe" ? "SECTION :" : "FORMATEUR :"}
                       </span>
                       <div className="w-[180px]">
                          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                            <SelectTrigger className="h-8 border-slate-400 bg-white font-bold text-[12px] uppercase">
                              <SelectValue placeholder="Sélectionnez..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {viewMode === "groupe" 
                                ? uniqueGroupes.map(g => <SelectItem key={g} value={g} className="font-bold">{g}</SelectItem>)
                                : uniqueFormateurs.map(f => <SelectItem key={f} value={f} className="font-bold">{f}</SelectItem>)
                              }
                            </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
                 
                 <div className="text-center space-y-2">
                    <h2 className="text-[14px] font-black uppercase underline decoration-2 underline-offset-4 tracking-tighter">
                       EMPLOI DU TEMPS 2025/2026
                    </h2>
                    <div className="flex justify-center gap-4">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setViewMode("groupe"); setSelectedEntity(""); }}
                        className={`h-7 px-3 rounded-md text-[9px] font-black uppercase ${viewMode === "groupe" ? "bg-[#00508f] text-white" : "border border-slate-300"}`}
                       >
                         Groupes
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setViewMode("formateur"); setSelectedEntity(""); }}
                        className={`h-7 px-3 rounded-md text-[9px] font-black uppercase ${viewMode === "formateur" ? "bg-[#00508f] text-white" : "border border-slate-300"}`}
                       >
                         Formateurs
                       </Button>
                    </div>
                 </div>

                 <div className="flex flex-col items-end gap-2">
                    <div className="h-10 w-auto opacity-80"><OFPPTLogo /></div>
                    <div className="flex justify-center items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded">
                       <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setCurrentWeekOffset(prev => prev - 1)}>
                          <ChevronLeft className="h-3 w-3" />
                       </Button>
                       <p className="text-[11px] font-bold text-slate-700">
                          {currentPeriod.display}
                       </p>
                       <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setCurrentWeekOffset(prev => prev + 1)}>
                          <ChevronRight className="h-3 w-3" />
                       </Button>
                    </div>
                 </div>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full border-collapse border-b-[1px] border-slate-400">
                    <thead>
                       <tr className="bg-slate-50">
                          <th className="p-3 border-[1px] border-slate-400 text-[11px] font-bold uppercase text-slate-800 w-[100px]">Jours/Heures</th>
                          {TIME_SLOTS.map(slot => (
                            <th key={slot.debut} className="p-3 border-[1px] border-slate-400 text-center text-[11px] font-bold uppercase text-slate-800 tracking-wider bg-slate-100">{slot.debut} - {slot.fin}</th>
                          ))}
                       </tr>
                    </thead>
                    <tbody className="divide-y-[1px] divide-slate-400">
                       {DAYS.map((day, dayIdx) => (
                         <tr key={day} className="h-32">
                            <td className="p-3 border-[1px] border-slate-400 bg-slate-50 font-bold text-[12px] text-slate-500 uppercase h-full text-center align-middle">
                               {day}
                            </td>
                            {TIME_SLOTS.map(slot => {
                               const cellData = filteredEmplois.find(e => e.jourSemaine === (dayIdx + 1) && e.heureDebut === slot.debut);
                               return (
                                 <td key={`${day}-${slot.debut}`} className="p-1 border-[1px] border-slate-400 bg-white min-w-[200px] relative align-middle">
                                    {cellData && (
                                       <div className={`h-full min-h-[110px] flex flex-col justify-center items-center text-center p-2 rounded-sm ${cellData.estForcé ? 'bg-amber-50 border-[2px] border-amber-400 ring-2 ring-amber-100' : ''}`}>
                                          <div className="space-y-0.5 w-full">
                                             <p className="text-[10px] font-bold text-slate-500 uppercase">SALLE : {cellData.salleNom}</p>
                                             <p className="text-[11px] font-black text-[#00508f] uppercase leading-none">
                                                {viewMode === "groupe" ? `FORMATEUR : ${cellData.formateurNom.split(' ')[0]}` : `GROUPE : ${cellData.groupeCode}`}
                                             </p>
                                             <div className="flex justify-center items-center gap-1 mt-1">
                                                <p className="text-[10px] font-black text-slate-900 border-t border-slate-200 pt-1 w-full uppercase leading-tight">
                                                  MODULE : <span className="text-emerald-700 block text-[11px] mt-0.5" title={cellData.moduleIntitule}>{cellData.moduleIntitule?.length > 28 ? cellData.moduleIntitule.substring(0, 28) + '...' : cellData.moduleIntitule} ({cellData.filiereCode})</span>
                                                </p>
                                             </div>
                                             {cellData.estForcé && (
                                                <div className="mt-1 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block animate-pulse">
                                                   RÉGULATION RÉELLE
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    )}
                                 </td>
                               );
                            })}
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              
              {/* FOOTER OFPPT */}
              <div className="grid grid-cols-2 p-6 bg-slate-50 border-t-[1px] border-slate-400">
                 <div className="text-center space-y-8">
                    <p className="text-[11px] font-bold text-slate-800 uppercase underline">Formateur</p>
                 </div>
                 <div className="text-center space-y-8">
                    <p className="text-[11px] font-bold text-slate-800 uppercase underline">Directeur Pédagogique</p>
                 </div>
              </div>
           </div>
        )}

        <footer className="pt-10 flex items-center gap-4 text-slate-300 border-t border-slate-50">
           <Database className="h-4 w-4" />
           <p className="text-[9px] font-bold uppercase tracking-widest italic">Authenticité des Données Certifiée — Aucun mockup affiché dans cet espace.</p>
        </footer>
      </div>
    </div>
  );
}
