import React, { useState, useEffect, useMemo } from 'react';
import { 
  CalendarClock, Printer, BrainCircuit, AlertTriangle, ArrowRight, Zap, 
  Database, ChevronLeft, ChevronRight, FileText, LayoutGrid, Users, School,
  CheckCircle, Cpu
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFPPTLogo } from "@/components/ui/ofppt-logo";
import { toast } from "sonner";

// PROFESSIONNEL DESIGN TOKENS
const TIME_SLOTS = [
  { debut: "08:30", fin: "11:00" },
  { debut: "11:00", fin: "13:30" },
  { debut: "13:30", fin: "16:00" },
  { debut: "16:00", fin: "18:30" }
];

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const getEtabId = () => localStorage.getItem("selected_etab_id") || '8d16718e-1f4a-4ed0-b701-8b62c430266f';

const getWeekDates = (offset = 0) => {
    const today = new Date();
    today.setDate(today.getDate() + (1 - today.getDay() + 7) % 7 + (offset * 7));
    const monday = new Date(today);
    const saturday = new Date(today);
    saturday.setDate(monday.getDate() + 5);
    
    return {
      monday: monday.toISOString().split('T')[0],
      saturday: saturday.toISOString().split('T')[0],
      display: `Du ${monday.toLocaleDateString('fr-FR')} Au ${saturday.toLocaleDateString('fr-FR')}`
    };
};

export default function EmploiDuTemps() {
  const [emplois, setEmplois] = useState([]);
  const [viewMode, setViewMode] = useState("groupe"); 
  const [selectedEntity, setSelectedEntity] = useState("");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [allGroupes, setAllGroupes] = useState([]);
  const [allFormateurs, setAllFormateurs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [aiAdvice, setAiAdvice] = useState([]);

  const currentPeriod = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset]);

  useEffect(() => {
    fetchData();
    fetchMetadata();
  }, [currentPeriod]);

  const fetchMetadata = async () => {
    try {
      const headers = { 'x-etab-id': getEtabId() };
      const [gRes, fRes] = await Promise.all([
        fetch('/api/groupes', { headers }),
        fetch('/api/formateurs', { headers })
      ]);
      const gData = await gRes.json();
      const fData = await fRes.json();
      setAllGroupes(gData || []);
      setAllFormateurs(fData || []);
    } catch (e) {
      console.error("Meta fetch error:", e);
    }
  };

  const fetchData = async () => {
    try {
      const etabId = getEtabId();
      const headers = { 'x-etab-id': etabId };
      
      const [respIa, respManual] = await Promise.all([
        fetch(`http://localhost:8082/api/emplois-ia?etablissementId=${etabId}`, { headers }),
        fetch(`http://localhost:8082/api/emplois?etablissementId=${etabId}`, { headers })
      ]);
      
      const dataIa = await respIa.json();
      const dataManual = await respManual.json();
      
      // Combine them
      const combined = [
          ...(dataIa.emplois || []).map((e: any) => ({ ...e, isIa: true })),
          ...(dataManual.emplois || []).map((e: any) => ({ ...e, isIa: false }))
      ];
      
      setEmplois(combined);
      setAllGroupes(dataIa.groupes || []);
      if (!selectedEntity && dataIa.groupes?.length > 0) {
        setSelectedEntity(dataIa.groupes[0].code);
      }
    } catch (error) {
      toast.error("Erreur de synchronisation des plannings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateIA = async () => {
      if (!window.confirm("Voulez-vous figer ces séances ? Elles deviendront définitives et l'IA respectera ces emplacements pour les prochains calculs.")) return;
      setIsGenerating(true);
      try {
          const etabId = getEtabId();
          const resp = await fetch('http://localhost:8082/api/valide-ia', { 
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'x-etab-id': etabId
              },
              body: JSON.stringify({ etablissementId: etabId })
          });
          const data = await resp.json();
          if (data.success) {
              toast.success(`${data.count} séances ont été fixées définitivement.`);
              fetchData();
          } else {
              toast.error(data.message || "Erreur de validation.");
          }
      } catch (e) {
          toast.error("Échec de la validation stratégique.");
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGenerateIA = async () => {
    setIsGenerating(true);
    try {
      const etabId = getEtabId();
      const resp = await fetch('http://localhost:8082/api/genere-emploi', { 
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json',
            'x-etab-id': etabId 
        },
        body: JSON.stringify({ etablissementId: etabId, weeksCount: 4 })
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Calcul terminé : ${data.count} séances de régulation créées.`);
      } else {
        toast.error(data.anomalies?.[0] || "Erreur lors du calcul.");
      }
      fetchData();
    } catch (e: any) {
      toast.error("Erreur système lors du calcul stratégique.");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPDF = () => window.print();

  const uniqueGroupes = useMemo(() => allGroupes.map(g => g.code), [allGroupes]);
  const uniqueFormateurs = useMemo(() => allFormateurs.map(f => `${f.nom} ${f.prenom}`), [allFormateurs]);
  const uniqueSalles = useMemo(() => [...new Set(emplois.map(e => e.salleNom))].filter(Boolean), [emplois]);

  const filteredEmplois = useMemo(() => {
    if (!selectedEntity) return [];
    return emplois.filter(e => viewMode === "groupe" ? e.groupeCode === selectedEntity : e.formateurNom === selectedEntity);
  }, [emplois, viewMode, selectedEntity]);

  const etabNom = "CF NAHDA";

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#00508f] selection:text-white">
      <div className="max-w-[1600px] mx-auto p-12 space-y-12">
        
        {/* HEADER EXPERT */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-slate-100">
           <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#00963f] font-black tracking-tighter text-sm">
                <CalendarClock className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{etabNom}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Moteur de <span className="text-[#00508f]">Régulation Dynamique</span></h1>
           </div>

           <div className="flex items-center gap-3">
             <Button variant="outline" onClick={exportPDF} className="h-11 px-6 rounded-xl border-slate-200 font-bold text-[10px] uppercase tracking-widest gap-2 bg-white">
               <Printer className="h-4 w-4 text-slate-400" />
               Générer Rapports PDF
             </Button>
             <div className="flex gap-2">
            <button
               onClick={handleValidateIA}
               className="h-11 px-6 rounded-xl flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest text-white transition-all active:scale-95"
               style={{ backgroundColor: '#10b981' }}
               disabled={isGenerating || emplois.filter(e => e.isIa).length === 0}
            >
               <CheckCircle size={18} />
               <span>Valider et Fixer le Planning</span>
            </button>

            <button 
              onClick={handleGenerateIA} 
              className="h-11 px-8 rounded-xl bg-slate-900 hover:bg-[#00508f] text-white font-bold text-[10px] uppercase tracking-widest gap-2 shadow-md transition-all active:scale-95 flex items-center"
              disabled={isGenerating}
            >
              <Cpu size={18} className={isGenerating ? 'animate-spin' : ''} />
              <span>{isGenerating ? 'Calcul Stratégique...' : 'Calculer Prédiction Réelle'}</span>
            </button>
          </div>
           </div>
        </header>

        {/* AI ADVICE & ANOMALIES */}
        <div className="grid md:grid-cols-2 gap-6">
          {anomalies.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-2xl">
               <div className="flex items-center gap-2 text-red-700 font-bold text-[11px] uppercase mb-4">
                 <AlertTriangle className="h-4 w-4" /> Analyse d'Intégrité (Fails)
               </div>
               <div className="grid gap-2">
                 {anomalies.slice(0, 4).map((a, idx) => (
                   <div key={idx} className="bg-white p-3 rounded-lg text-[10px] font-bold text-slate-600 border border-red-100">{a}</div>
                 ))}
               </div>
            </div>
          )}
          {aiAdvice.length > 0 && (
            <div className="bg-blue-50 border-l-4 border-[#00508f] p-6 rounded-r-2xl">
               <div className="flex items-center gap-2 text-[#00508f] font-bold text-[11px] uppercase mb-4">
                 <Zap className="h-4 w-4 text-amber-500" /> Executive Strategist Advisor
               </div>
               <div className="text-sm font-semibold text-slate-700 leading-relaxed italic">
                  {aiAdvice[0]}
               </div>
            </div>
          )}
        </div>

        {/* MAIN GRID */}
        {allGroupes.length > 0 ? (
          <div className="bg-white border-[1px] border-slate-300 shadow-2xl rounded-sm overflow-hidden font-[Arial,sans-serif]">
             <div className="grid grid-cols-3 p-6 border-b border-slate-400 bg-slate-50/50">
                <div className="text-[10px] font-bold text-slate-800 space-y-4">
                   <p className="tracking-widest">GROUPE RÉGIONAL / DRO / CFI</p>
                   <div className="flex items-center gap-2">
                      <span className="bg-white px-3 py-2 border border-slate-300 rounded font-black text-[11px] uppercase shadow-sm">
                         {viewMode === "groupe" ? "SECTION :" : "FORMATEUR :"}
                      </span>
                      <div className="w-[220px]">
                         <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                           <SelectTrigger className="h-10 border-slate-400 bg-white font-black text-[13px] uppercase">
                             <SelectValue placeholder="SÉLECTIONNER VARIABLE..." />
                           </SelectTrigger>
                           <SelectContent>
                             {viewMode === "groupe" 
                               ? uniqueGroupes.map(g => <SelectItem key={g} value={g} className="font-bold">{g}</SelectItem>)
                               : uniqueFormateurs.map(f => <SelectItem key={f} value={f} className="font-bold">{f}</SelectItem>)
                             }
                           </SelectContent>
                         </Select>
                      </div>
                   </div>
                </div>
                
                <div className="text-center">
                   <h2 className="text-[18px] font-black uppercase underline decoration-4 underline-offset-8 tracking-tighter mb-4">
                      EMPLOI DU TEMPS 2025/2026
                   </h2>
                   <div className="flex justify-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => { setViewMode("groupe"); setSelectedEntity(""); }} className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "groupe" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>GROUPES</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setViewMode("formateur"); setSelectedEntity(""); }} className={`h-8 px-4 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "formateur" ? "bg-slate-900 text-white" : "border border-slate-200"}`}>FORMATEURS</Button>
                   </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                   <div className="h-12 opacity-90"><OFPPTLogo /></div>
                   <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
                      <ChevronLeft className="h-4 w-4 cursor-pointer hover:text-[#00963f]" onClick={() => setCurrentWeekOffset(p => p - 1)} />
                      <p className="text-[10px] font-black uppercase tracking-widest">{currentPeriod.display}</p>
                      <ChevronRight className="h-4 w-4 cursor-pointer hover:text-[#00963f]" onClick={() => setCurrentWeekOffset(p => p + 1)} />
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                   <thead>
                      <tr className="bg-slate-100">
                         <th className="p-4 border border-slate-400 text-[11px] font-black uppercase text-slate-800 w-[120px]">JOURS</th>
                         {TIME_SLOTS.map(s => <th key={s.debut} className="p-4 border border-slate-400 text-center text-[10px] font-black uppercase tracking-widest">{s.debut} - {s.fin}</th>)}
                      </tr>
                   </thead>
                   <tbody>
                      {DAYS.map((day, dIdx) => (
                        <tr key={day} className="h-36">
                           <td className="p-4 border border-slate-400 bg-slate-50 font-black text-[14px] text-slate-500 uppercase text-center align-middle">{day}</td>
                           {TIME_SLOTS.map(slot => {
                              const e = filteredEmplois.find(x => x.jourSemaine === (dIdx + 1) && x.heureDebut === slot.debut);
                              return (
                                <td key={slot.debut} className="p-2 border border-slate-400 bg-white min-w-[240px] relative">
                                   {e && (
                                      <div className={`h-full flex flex-col justify-center items-center text-center p-3 rounded-lg border-2 shadow-sm transition-all hover:scale-[1.02] ${e.estForcé ? 'bg-amber-50 border-amber-400 shadow-amber-50' : 'bg-blue-50/50 border-blue-200'}`}>
                                         <p className={`text-[9px] font-black uppercase mb-1 ${e.estForcé ? 'text-amber-700' : 'text-slate-400'}`}>SALLE : {e.salleNom}</p>
                                         <p className={`text-[12px] font-black uppercase mb-1 ${e.estForcé ? 'text-amber-900' : 'text-[#00508f]'}`}>
                                           {viewMode === "groupe" ? `FORMATEUR : ${e.formateurNom.split(' ')[0]}` : `GROUPE : ${e.groupeCode}`}
                                         </p>
                                         <div className={`mt-1 pt-1 border-t w-full text-[11px] font-black uppercase ${e.estForcé ? 'border-amber-200 text-amber-950' : 'border-slate-200 text-slate-900'}`}>
                                           {e.moduleIntitule.substring(0, 32)}...
                                         </div>
                                         <div className={`mt-3 text-[8px] font-black uppercase px-3 py-1 rounded-full text-white shadow-sm ${e.estForcé ? 'bg-amber-500 animate-pulse' : 'bg-[#00508f]'}`}>
                                           {e.estForcé ? '🚨 RÉGULATION RÉELLE (RETARD)' : '✓ SÉANCE NORMALE'}
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
          </div>
        ) : (
          <div className="h-[400px] bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10 space-y-6">
             <div className="p-6 bg-white rounded-full shadow-inner"><Database className="h-12 w-12 text-slate-200" /></div>
             <div className="max-w-md space-y-2">
                <h3 className="text-xl font-bold text-slate-400 uppercase">Données Réelles Indisponibles</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  L'IA attend vos données d'avancement pour générer le planning stratégique.
                </p>
             </div>
          </div>
        )}

        <footer className="pt-10 flex items-center justify-between text-slate-500 border-t border-slate-200">
           <div className="flex items-center gap-3">
             <Database className="h-4 w-4 text-[#00508f]" />
             <p className="text-[10px] font-black uppercase tracking-widest italic">CHRONOS ELITE v4.4 — COGNITIVE FLOW (Garantie de conformité OFPPT)</p>
           </div>
           <p className="text-[9px] font-bold uppercase italic opacity-70">Les modules validés à 100% sont automatiquement exclus de ce planning.</p>
        </footer>
      </div>
    </div>
  );
}
