import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const alertBadgeVariants = cva(
  "inline-flex items-center border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      niveau: {
        disciplinaire:
          "border-red-600 bg-red-600 text-white hover:bg-red-700",
        critique:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20",
        warning:
          "border-transparent bg-warning/10 text-warning hover:bg-warning/20",
        anomalie:
          "border-transparent bg-warning/10 text-warning hover:bg-warning/20",
        info: 
          "border-transparent bg-info/10 text-info hover:bg-info/20"
      },
    },
    defaultVariants: {
      niveau: "info",
    },
  }
)

export interface AlertBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertBadgeVariants> {
    label?: string;
    dot?: boolean;
}

function AlertBadge({ className, niveau, label, dot = true, children, ...props }: AlertBadgeProps) {
  let dotColor = "bg-info";
  if (niveau === "disciplinaire") dotColor = "bg-white";
  else if (niveau === "critique") dotColor = "bg-destructive";
  else if (niveau === "warning" || niveau === "anomalie") dotColor = "bg-warning";
  
  return (
    <Badge className={cn(alertBadgeVariants({ niveau }), className, "rounded-md px-2 py-0.5 text-xs font-mono")} {...props} variant="outline">
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", dotColor)} />}
      {label || children}
    </Badge>
  )
}

export { AlertBadge, alertBadgeVariants }