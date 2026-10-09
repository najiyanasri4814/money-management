import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy-900 text-white",
        secondary: "border-transparent bg-slate-100 text-navy-900",
        income: "border-transparent bg-green-50 text-green-700",
        expense: "border-transparent bg-red-50 text-red-700",
        savings: "border-transparent bg-blue-50 text-blue-700",
        outline: "border-slate-300 text-navy-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };