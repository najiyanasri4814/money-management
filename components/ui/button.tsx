import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        success: "bg-green-600 text-white shadow-sm hover:bg-green-700",
        outline:
          "border border-slate-300 bg-white text-navy-950 shadow-sm hover:bg-slate-50",
        secondary: "bg-slate-100 text-navy-950 hover:bg-slate-200",
        ghost: "text-navy-950 hover:bg-slate-100",
        link: "text-navy-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, loadingText, disabled, asChild = false, children, ...props },
    ref
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={classes}
          aria-disabled={disabled || loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };