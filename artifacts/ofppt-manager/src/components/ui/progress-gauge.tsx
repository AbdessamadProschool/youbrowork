import * as React from "react"
import { cn } from "@/lib/utils"

export interface ProgressGaugeProps extends React.HTMLAttributes<HTMLDivElement> {
  tauxReel?: number | null;
  tauxTheorique?: number | null;
  ecart?: number | null;
  statut?: string;
  showLabels?: boolean;
}

const ProgressGauge = React.forwardRef<HTMLDivElement, ProgressGaugeProps>(
  ({ className, tauxReel = 0, tauxTheorique = 0, ecart = 0, statut, showLabels = true, ...props }, ref) => {
    const reel = tauxReel || 0;
    const theorique = tauxTheorique || 0;
    
    let colorClass = "bg-gray-400";
    let icon = "○";
    if (statut === "en_avance") { colorClass = "bg-success"; icon = "▲"; }
    else if (statut === "a_jour") { colorClass = "bg-info"; icon = "●"; }
    else if (statut === "en_retard") { colorClass = "bg-destructive"; icon = "▼"; }
    else if (statut === "anomalie") { colorClass = "bg-warning"; icon = "!"; }
    
    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5 w-full", className)} {...props}>
        {showLabels && (
          <div className="flex justify-between items-end text-xs font-mono">
            <span className="flex items-center gap-1">
              <span className={cn("text-[10px]", colorClass.replace('bg-', 'text-'))}>{icon}</span>
              <span className="font-semibold">{reel.toFixed(1)}%</span> réel
            </span>
            <span className="text-muted-foreground">{theorique.toFixed(1)}% théo.</span>
          </div>
        )}
        <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
          {/* Theoretical target line */}
          <div 
            className="absolute top-0 bottom-0 border-r-2 border-dashed border-muted-foreground/50 z-10"
            style={{ width: `${Math.min(100, Math.max(0, theorique))}%` }}
          />
          {/* Real progress bar */}
          <div 
            className={cn("h-full transition-all duration-500 ease-in-out", colorClass)}
            style={{ width: `${Math.min(100, Math.max(0, reel))}%` }}
          />
        </div>
        {showLabels && ecart !== null && ecart !== undefined && (
           <div className={cn("text-[10px] font-mono text-right", ecart < 0 ? "text-destructive" : (ecart > 0 ? "text-success" : "text-muted-foreground"))}>
              Écart: {ecart > 0 ? '+' : ''}{ecart.toFixed(1)}%
           </div>
        )}
      </div>
    )
  }
)
ProgressGauge.displayName = "ProgressGauge"

export { ProgressGauge }