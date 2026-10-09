import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[70px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-navy-950 placeholder:text-slate-400 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };