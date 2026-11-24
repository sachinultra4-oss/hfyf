import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-blue-700 border border-blue-200/80",
        secondary: "bg-slate-100 text-slate-700 border border-slate-200",
        destructive: "bg-red-100 text-red-700 border border-red-200 font-semibold",
        warning: "bg-amber-50 text-amber-800 border border-amber-200/80",
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
        outline: "border border-slate-200 text-slate-700 bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
