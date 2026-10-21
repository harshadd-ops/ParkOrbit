import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1 text-[13px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-ink text-canvas",
        secondary: "bg-white text-ink border border-ink/20",
        outline: "bg-transparent text-ink border border-ink",
        signal: "bg-signal text-white",
        orbit: "bg-signal-light/15 text-signal-clay border border-signal-light/40",
        demo: "bg-canvas text-granite border border-ink/25 uppercase tracking-[0.04em] text-[11px] font-bold",
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
