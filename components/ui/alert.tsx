import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "border-blue-200 bg-blue-50 text-blue-800", icon: <Info className="h-4 w-4" /> },
  success: {
    box: "border-green-200 bg-green-50 text-green-800",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: <AlertCircle className="h-4 w-4" /> },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <TriangleAlert className="h-4 w-4" />,
  },
} as const;

export type AlertVariant = keyof typeof styles;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

export function Alert({ variant = "info", title, className, children, ...props }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-sm", s.box, className)}
      {...props}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold leading-tight">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}