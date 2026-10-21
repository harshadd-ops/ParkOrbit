import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[16px] font-medium tracking-[-0.02em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-canvas border-[1.5px] border-ink rounded-cta hover:bg-charcoal",
        secondary:
          "bg-white text-ink border-[1.5px] border-ink rounded-cta font-[450] hover:bg-lifted",
        outline:
          "bg-transparent text-ink border-[1.5px] border-ink rounded-cta font-[450] hover:bg-white",
        consent:
          "bg-signal text-white border-0 rounded-consent text-[13px] font-normal tracking-[0.01em] hover:bg-signal-clay",
        ghost:
          "bg-transparent text-ink rounded-cta hover:bg-white/70",
        link:
          "text-signal-clay underline-offset-4 hover:underline p-0 h-auto",
        satellite:
          "bg-white text-ink rounded-full size-14 shadow-halo hover:bg-ink hover:text-canvas",
      },
      size: {
        default: "px-6 py-2 min-h-[42px]",
        sm: "px-4 py-1.5 text-[14px] min-h-[36px] rounded-cta",
        lg: "px-9 py-3.5 text-[16px] min-h-[52px] rounded-stadium",
        icon: "size-11 rounded-full p-0",
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
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
