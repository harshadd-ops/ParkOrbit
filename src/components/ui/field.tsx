import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-pill border border-ink/35 bg-white px-5 py-2.5 text-[15px] font-[450] text-ink placeholder:text-slate focus-visible:outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-signal",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-[24px] border border-ink/35 bg-white px-5 py-3.5 text-[15px] font-[450] text-ink placeholder:text-slate focus-visible:outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-signal",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-5", className)}
    {...props}
  />
));
FieldGroup.displayName = "FieldGroup";

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { "data-invalid"?: boolean; "data-disabled"?: boolean }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 data-[invalid=true]:text-signal", className)}
    {...props}
  />
));
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[14px] font-medium text-ink leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
));
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[13px] font-[450] text-slate", className)}
    {...props}
  />
));
FieldDescription.displayName = "FieldDescription";

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset
    ref={ref}
    className={cn("flex flex-col gap-3 border-0 p-0 m-0", className)}
    {...props}
  />
));
FieldSet.displayName = "FieldSet";

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn("text-[14px] font-bold uppercase tracking-[0.04em] text-ink mb-2", className)}
    {...props}
  />
));
FieldLegend.displayName = "FieldLegend";

export {
  Input,
  Textarea,
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
};
