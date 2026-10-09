import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-navy-950 placeholder:text-slate-400 transition-colors focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };